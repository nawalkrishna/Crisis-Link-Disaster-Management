import { Router } from 'express';
import {
  createTaskSchema,
  idParamSchema,
  listTasksQuerySchema,
  updateTaskSchema,
  type TaskStatus,
} from '@crisislink/shared';
import { prisma } from '../db';
import type { Prisma } from '../generated/prisma/client';
import {
  assertCampAccess,
  canManageCamp,
  isActive,
  requireAuth,
  requireStaff,
} from '../auth/policies';
import type { AuthUser } from '../auth/session';
import { HttpError, conflict, forbidden, notFound, parse } from '../lib/http';
import { publish } from '../realtime';

export const tasksRouter = Router();

/**
 * A STATE MACHINE: a task can only move along these arrows.
 * Writing the rules down as data (instead of if/else scattered in handlers) makes them
 * easy to read, test and change - and impossible to bypass by accident.
 *
 *   OPEN --claim/assign--> ASSIGNED --start--> IN_PROGRESS --finish--> DONE
 *     ^                       |                    |
 *     +-------give up---------+--------------------+
 *   (almost) anything --cancel--> CANCELLED --reopen--> OPEN
 */
const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  OPEN: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'OPEN', 'CANCELLED'],
  IN_PROGRESS: ['DONE', 'OPEN', 'CANCELLED'],
  DONE: [],
  CANCELLED: ['OPEN'],
};

/** The subset of moves the assigned volunteer may make themselves. */
const VOLUNTEER_MOVES: Partial<Record<TaskStatus, readonly TaskStatus[]>> = {
  ASSIGNED: ['IN_PROGRESS', 'OPEN'],
  IN_PROGRESS: ['DONE', 'OPEN'],
};

const taskInclude = {
  camp: { select: { id: true, name: true } },
  district: { select: { slug: true, name: true } },
  assignee: { select: { id: true, fullName: true, phone: true } },
  createdBy: { select: { id: true, fullName: true } },
} satisfies Prisma.VolunteerTaskInclude;

type TaskRow = { campId: string | null; createdById: string };

/** Admins manage every task; coordinators manage tasks of their camps and tasks they created. */
const canManageTask = (user: AuthUser | undefined, task: TaskRow) =>
  isActive(user) &&
  (user.role === 'ADMIN' ||
    (user.role === 'COORDINATOR' &&
      ((task.campId !== null && canManageCamp(user, task.campId)) ||
        task.createdById === user.id)));

tasksRouter.get('/tasks', requireAuth, async (req, res) => {
  const { limit, offset, status, district, campId, mine } = parse(listTasksQuerySchema, req.query);
  const user = req.user!;
  const staff = isActive(user) && user.role !== 'VOLUNTEER';

  // What each role may see:
  //  - volunteers: open tasks (to pick from) + tasks assigned to them
  //  - staff: everything, or with ?mine=true the tasks of their camps / created by them
  const visibility: Prisma.VolunteerTaskWhereInput = staff
    ? mine
      ? { OR: [{ createdById: user.id }, { campId: { in: user.campIds } }] }
      : {}
    : mine
      ? { assigneeId: user.id }
      : { OR: [{ status: 'OPEN' }, { assigneeId: user.id }] };

  const where: Prisma.VolunteerTaskWhereInput = {
    AND: [
      visibility,
      {
        ...(status && { status }),
        ...(district && { district: { slug: district } }),
        ...(campId && { campId }),
      },
    ],
  };
  const [items, total] = await prisma.$transaction([
    prisma.volunteerTask.findMany({
      where,
      include: taskInclude,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      skip: offset,
    }),
    prisma.volunteerTask.count({ where }),
  ]);
  res.json({ items, total, limit, offset });
});

tasksRouter.post('/tasks', requireStaff, async (req, res) => {
  const { campId, district, ...data } = parse(createTaskSchema, req.body);
  const user = req.user!;

  let districtId: number;
  if (campId) {
    assertCampAccess(user, campId);
    const camp = await prisma.reliefCamp.findUnique({
      where: { id: campId },
      select: { districtId: true },
    });
    if (!camp) throw notFound('Camp');
    districtId = camp.districtId; // a camp task always belongs to the camp's district
  } else {
    if (user.role !== 'ADMIN') throw forbidden('Coordinators create tasks for their own camps');
    districtId = (await prisma.district.findUniqueOrThrow({ where: { slug: district! } })).id;
  }

  const task = await prisma.volunteerTask.create({
    data: { ...data, campId, districtId, createdById: user.id },
    include: taskInclude,
  });
  publish(req, { type: 'tasks.changed', campId: task.campId });
  res.status(201).json(task);
});

/** An approved volunteer takes an open task. */
tasksRouter.post('/tasks/:id/claim', requireAuth, async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const user = req.user!;
  if (user.role !== 'VOLUNTEER') throw forbidden('Only volunteers claim tasks');
  if (user.status !== 'ACTIVE') {
    throw forbidden('Your volunteer account is waiting for approval');
  }

  const task = await prisma.volunteerTask.findUnique({ where: { id } });
  if (!task) throw notFound('Task');
  if (task.requiredSkill) {
    const profile = await prisma.volunteerProfile.findUnique({ where: { userId: user.id } });
    if (!profile?.skills.includes(task.requiredSkill)) {
      throw conflict('SKILL_REQUIRED', `This task needs the ${task.requiredSkill} skill`);
    }
  }

  // Conditional update: if two volunteers claim at once, only the first matches status OPEN.
  const { count } = await prisma.volunteerTask.updateMany({
    where: { id, status: 'OPEN' },
    data: { status: 'ASSIGNED', assigneeId: user.id },
  });
  if (count === 0) throw conflict('TASK_TAKEN', 'This task is no longer open');
  publish(req, { type: 'tasks.changed', campId: task.campId });

  res.json(await prisma.volunteerTask.findUniqueOrThrow({ where: { id }, include: taskInclude }));
});

tasksRouter.patch('/tasks/:id', requireAuth, async (req, res) => {
  const { id } = parse(idParamSchema, req.params);
  const input = parse(updateTaskSchema, req.body);
  const user = req.user!;

  const task = await prisma.volunteerTask.findUnique({ where: { id } });
  if (!task) throw notFound('Task');

  const manager = canManageTask(user, task);
  const assignee = task.assigneeId === user.id && isActive(user);
  if (!manager && !assignee) throw forbidden();

  const { status: requestedStatus, assigneeId, ...details } = input;
  if (
    !manager &&
    (assigneeId !== undefined || Object.values(details).some((v) => v !== undefined))
  ) {
    throw forbidden('Only coordinators can edit task details or assignment');
  }

  // Work out the new status and assignee.
  let nextStatus = requestedStatus ?? task.status;
  let nextAssignee = task.assigneeId;
  if (assigneeId !== undefined) {
    if (assigneeId) {
      const volunteer = await prisma.user.findUnique({ where: { id: assigneeId } });
      if (volunteer?.role !== 'VOLUNTEER' || volunteer.status !== 'ACTIVE') {
        throw new HttpError(400, 'INVALID_ASSIGNEE', 'Assignee must be an active volunteer');
      }
      nextAssignee = assigneeId;
      if (!requestedStatus && task.status === 'OPEN') nextStatus = 'ASSIGNED';
    } else {
      nextAssignee = null;
      if (!requestedStatus) nextStatus = 'OPEN';
    }
  }
  if (nextStatus === 'OPEN') nextAssignee = null; // giving a task up frees it for others

  if (nextStatus !== task.status) {
    const allowed = manager ? TRANSITIONS[task.status] : (VOLUNTEER_MOVES[task.status] ?? []);
    if (!allowed.includes(nextStatus)) {
      throw conflict(
        'INVALID_TRANSITION',
        `Cannot move a task from ${task.status} to ${nextStatus}`,
      );
    }
  }
  if ((nextStatus === 'ASSIGNED' || nextStatus === 'IN_PROGRESS') && !nextAssignee) {
    throw new HttpError(400, 'ASSIGNEE_REQUIRED', `A ${nextStatus} task needs an assignee`);
  }

  // Optimistic concurrency: only apply if nobody changed the status since we read it.
  const { count } = await prisma.volunteerTask.updateMany({
    where: { id, status: task.status },
    data: {
      ...details,
      status: nextStatus,
      assigneeId: nextAssignee,
      completedAt: nextStatus === 'DONE' ? new Date() : null,
    },
  });
  if (count === 0) throw conflict('STALE_TASK', 'The task was changed by someone else - reload it');
  publish(req, { type: 'tasks.changed', campId: task.campId });

  res.json(await prisma.volunteerTask.findUniqueOrThrow({ where: { id }, include: taskInclude }));
});
