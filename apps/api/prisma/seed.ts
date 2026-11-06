/**
 * Seed script: `npm run db:seed` (also runs after `npm run db:reset`).
 *
 * 1. Districts are reference data the app needs everywhere -> always upserted.
 *    "Upsert" = insert if missing, update if present, so running it twice is safe (idempotent).
 * 2. Sample camps/needs/incidents are only for local development and are skipped
 *    when the database already has camps or NODE_ENV=production.
 * All people and phone numbers below are fictional.
 */
import { DISTRICTS } from '@crisislink/shared';
import { hashPassword } from '../src/auth/password';
import { config } from '../src/config';
import { prisma } from '../src/db';

async function seedDistricts() {
  for (const d of DISTRICTS) {
    await prisma.district.upsert({
      where: { slug: d.slug },
      update: { name: d.name },
      create: { slug: d.slug, name: d.name },
    });
  }
  console.log(`Districts: ${DISTRICTS.length} upserted`);
}

async function seedSampleData() {
  if (process.env.NODE_ENV === 'production') return;
  if ((await prisma.reliefCamp.count()) > 0) {
    console.log('Sample data: skipped (camps already exist)');
    return;
  }

  const meppadi = await prisma.reliefCamp.create({
    data: {
      name: 'GHSS Meppadi Relief Camp',
      address: 'Govt. Higher Secondary School, Meppadi',
      district: { connect: { slug: 'wayanad' } },
      capacity: 300,
      contactName: 'Anitha K',
      contactPhone: '9400000001',
      latitude: 11.5551,
      longitude: 76.1347,
      evacuees: {
        create: [
          { fullName: 'Ramesh P', age: 54, gender: 'MALE', homeAddress: 'Chooralmala' },
          { fullName: 'Sreeja Ramesh', age: 49, gender: 'FEMALE', homeAddress: 'Chooralmala' },
          {
            fullName: 'Aadhi R',
            age: 7,
            gender: 'MALE',
            homeAddress: 'Chooralmala',
            medicalNotes: 'Asthma - needs inhaler',
          },
          { fullName: 'Fathima N', age: 71, gender: 'FEMALE', homeAddress: 'Mundakkai' },
        ],
      },
      needs: {
        create: [
          {
            item: 'Drinking water (1L bottles)',
            category: 'WATER',
            quantityNeeded: 600,
            unit: 'bottles',
            priority: 'CRITICAL',
          },
          {
            item: 'Asthma inhalers (salbutamol)',
            category: 'MEDICINE',
            quantityNeeded: 10,
            priority: 'HIGH',
          },
          {
            item: 'Blankets',
            category: 'BEDDING',
            quantityNeeded: 150,
            priority: 'MEDIUM',
            quantityFulfilled: 40,
          },
        ],
      },
    },
  });

  await prisma.reliefCamp.create({
    data: {
      name: 'St. Joseph’s Parish Hall',
      address: 'Kattappana Town, Idukki',
      district: { connect: { slug: 'idukki' } },
      capacity: 120,
      contactName: 'Fr. Thomas M',
      contactPhone: '9400000002',
      evacuees: {
        create: [
          { fullName: 'Joseph Varghese', age: 62, gender: 'MALE' },
          { fullName: 'Mary Joseph', age: 58, gender: 'FEMALE' },
        ],
      },
      needs: {
        create: [
          { item: 'Rice', category: 'FOOD', quantityNeeded: 200, unit: 'kg', priority: 'HIGH' },
          {
            item: 'Sanitary pads',
            category: 'HYGIENE',
            quantityNeeded: 100,
            unit: 'packs',
            priority: 'HIGH',
          },
        ],
      },
    },
  });

  await prisma.reliefCamp.create({
    data: {
      name: 'Kuttanad Community Hall',
      address: 'Ramankary, Kuttanad',
      district: { connect: { slug: 'alappuzha' } },
      capacity: 80,
      status: 'OPEN',
      needs: {
        create: [
          {
            item: 'Children’s clothing',
            category: 'CLOTHING',
            quantityNeeded: 60,
            priority: 'LOW',
          },
        ],
      },
    },
  });

  await prisma.incidentReport.createMany({
    data: [
      {
        type: 'LANDSLIDE',
        severity: 'CRITICAL',
        status: 'VERIFIED',
        description: 'Major landslide, houses buried, road to Mundakkai cut off.',
        locationText: 'Mundakkai, Meppadi',
        districtId: (await districtId('wayanad'))!,
        latitude: 11.4853,
        longitude: 76.1647,
      },
      {
        type: 'FLOOD',
        severity: 'HIGH',
        description: 'Water level rising quickly near the river bank, families on rooftops.',
        locationText: 'Ramankary, Kuttanad',
        districtId: (await districtId('alappuzha'))!,
      },
      {
        type: 'ROAD_BLOCKED',
        severity: 'MEDIUM',
        description: 'Fallen trees blocking the ghat road.',
        locationText: 'Kuttikkanam - Kattappana road',
        districtId: (await districtId('idukki'))!,
      },
    ],
  });

  const water = await prisma.campNeed.findFirstOrThrow({
    where: { campId: meppadi.id, category: 'WATER' },
  });
  await prisma.donation.createMany({
    data: [
      {
        donorName: 'Kerala Traders Association',
        category: 'WATER',
        item: 'Drinking water',
        quantity: 200,
        needId: water.id,
        campId: meppadi.id,
      },
      {
        donorName: 'Anonymous',
        category: 'FOOD',
        item: 'Biscuits',
        quantity: 50,
        campId: meppadi.id,
      },
    ],
  });

  console.log('Sample data: 3 camps, 6 evacuees, 6 needs, 3 incidents, 2 donations');
}

async function districtId(slug: string) {
  return (await prisma.district.findUnique({ where: { slug } }))?.id;
}

/**
 * 3. Sample accounts, one per role, so you can try the permission rules locally.
 *    Only when DEV_SEED_PASSWORD is set in apps/api/.env, and never in production.
 *    Emails use the reserved `.test` domain, which can never be a real mailbox.
 */
async function seedUsers() {
  const password = config.devSeedPassword;
  if (config.isProduction || !password) {
    console.log('Users: skipped (set DEV_SEED_PASSWORD in apps/api/.env to create sample users)');
    return;
  }
  const passwordHash = await hashPassword(password);
  const wayanad = await prisma.district.findUniqueOrThrow({ where: { slug: 'wayanad' } });
  const idukki = await prisma.district.findUniqueOrThrow({ where: { slug: 'idukki' } });

  const accounts = [
    { email: 'admin@crisislink.test', fullName: 'Admin User', role: 'ADMIN', status: 'ACTIVE' },
    {
      email: 'coordinator@crisislink.test',
      fullName: 'Anitha K (Coordinator)',
      role: 'COORDINATOR',
      status: 'ACTIVE',
    },
    {
      email: 'volunteer@crisislink.test',
      fullName: 'Asha Menon',
      role: 'VOLUNTEER',
      status: 'ACTIVE',
      profile: { districtId: wayanad.id, skills: ['FIRST_AID', 'DRIVING'] as const },
    },
    {
      email: 'pending@crisislink.test',
      fullName: 'Rahul Nair',
      role: 'VOLUNTEER',
      status: 'PENDING',
      profile: { districtId: idukki.id, skills: ['COOKING'] as const },
    },
  ] as const;

  for (const { profile, ...account } of accounts.map((a) => ({ profile: undefined, ...a }))) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { passwordHash, role: account.role, status: account.status },
      create: { ...account, phone: '9400000100', passwordHash },
    });
    if (profile) {
      await prisma.volunteerProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, districtId: profile.districtId, skills: [...profile.skills] },
      });
    }
  }

  // The coordinator manages the Meppadi camp (if the sample camps exist).
  const coordinator = await prisma.user.findUniqueOrThrow({
    where: { email: 'coordinator@crisislink.test' },
  });
  const meppadi = await prisma.reliefCamp.findFirst({ where: { name: { contains: 'Meppadi' } } });
  if (meppadi) {
    await prisma.campCoordinator.upsert({
      where: { userId_campId: { userId: coordinator.id, campId: meppadi.id } },
      update: {},
      create: { userId: coordinator.id, campId: meppadi.id },
    });
    if ((await prisma.volunteerTask.count()) === 0) {
      await prisma.volunteerTask.createMany({
        data: [
          {
            title: 'Unload water truck',
            description: 'A truck with 400 bottles arrives at 4 pm. Needs 4 people.',
            priority: 'HIGH',
            campId: meppadi.id,
            districtId: wayanad.id,
            createdById: coordinator.id,
          },
          {
            title: 'First-aid desk evening shift',
            description: 'Staff the first-aid desk 6 pm - 10 pm.',
            priority: 'MEDIUM',
            requiredSkill: 'FIRST_AID',
            campId: meppadi.id,
            districtId: wayanad.id,
            createdById: coordinator.id,
          },
          {
            title: 'Drive medicines from Kalpetta',
            description: 'Pick up a medicine box from the district hospital pharmacy.',
            priority: 'CRITICAL',
            requiredSkill: 'DRIVING',
            campId: meppadi.id,
            districtId: wayanad.id,
            createdById: coordinator.id,
          },
        ],
      });
    }
  }
  console.log(`Users: ${accounts.map((a) => a.email).join(', ')} (password = DEV_SEED_PASSWORD)`);
}

/**
 * 4. Map demo data (Phase 4): coordinates for the sample camps/incidents plus a few more camps
 *    across Kerala, so the map isn't empty. Safe to re-run: only fills in what's missing,
 *    which also upgrades databases seeded before Phase 4.
 */
const SAMPLE_CAMP_LOCATIONS: Record<string, [number, number]> = {
  'GHSS Meppadi Relief Camp': [11.5551, 76.1347],
  'St. Joseph’s Parish Hall': [9.7516, 77.1166],
  'Kuttanad Community Hall': [9.4296, 76.4648],
};
const SAMPLE_INCIDENT_LOCATIONS: Record<string, [number, number]> = {
  'Mundakkai, Meppadi': [11.4853, 76.1647],
  'Ramankary, Kuttanad': [9.4335, 76.4721],
  'Kuttikkanam - Kattappana road': [9.5833, 76.9667],
};
const EXTRA_CAMPS = [
  {
    name: 'Govt. LP School Aluva',
    address: 'Near Aluva Market, Aluva',
    district: 'ernakulam',
    capacity: 250,
    latitude: 10.1076,
    longitude: 76.3516,
  },
  {
    name: 'Chalakudy Town Hall',
    address: 'Main Road, Chalakudy',
    district: 'thrissur',
    capacity: 400,
    latitude: 10.307,
    longitude: 76.3337,
  },
  {
    name: 'Nilambur Govt. UP School',
    address: 'Chanthakunnu, Nilambur',
    district: 'malappuram',
    capacity: 150,
    latitude: 11.2769,
    longitude: 76.2256,
  },
  {
    name: 'Ranni St. Thomas Hall',
    address: 'Ittiyappara, Ranni',
    district: 'pathanamthitta',
    capacity: 200,
    latitude: 9.3846,
    longitude: 76.7856,
  },
  {
    name: 'Kalpetta Municipal Hall',
    address: 'Kalpetta Town, Wayanad',
    district: 'wayanad',
    capacity: 220,
    latitude: 11.6085,
    longitude: 76.0827,
  },
];

async function seedMapDemo() {
  if (process.env.NODE_ENV === 'production') return;
  let filled = 0;
  for (const [name, [latitude, longitude]] of Object.entries(SAMPLE_CAMP_LOCATIONS)) {
    const { count } = await prisma.reliefCamp.updateMany({
      where: { name, latitude: null },
      data: { latitude, longitude },
    });
    filled += count;
  }
  for (const [locationText, [latitude, longitude]] of Object.entries(SAMPLE_INCIDENT_LOCATIONS)) {
    const { count } = await prisma.incidentReport.updateMany({
      where: { locationText, latitude: null },
      data: { latitude, longitude },
    });
    filled += count;
  }
  let created = 0;
  for (const { district, ...camp } of EXTRA_CAMPS) {
    if (await prisma.reliefCamp.findFirst({ where: { name: camp.name } })) continue;
    await prisma.reliefCamp.create({
      data: { ...camp, district: { connect: { slug: district } } },
    });
    created++;
  }
  console.log(`Map demo: ${filled} locations filled in, ${created} extra camps created`);
}

try {
  await seedDistricts();
  await seedSampleData();
  await seedMapDemo();
  await seedUsers();
} finally {
  await prisma.$disconnect();
}
