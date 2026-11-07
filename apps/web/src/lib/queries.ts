import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CampNeed,
  CampSummary,
  CreateCampInput,
  CreateDonationInput,
  CreateNeedInput,
  CreateTaskInput,
  CurrentUser,
  DistrictSummary,
  Donation,
  Evacuee,
  Incident,
  Paginated,
  StatsResponse,
  Task,
  UpdateCampInput,
  UpdateNeedInput,
  UpdateProfileInput,
  UpdateTaskInput,
  UserListItem,
  VolunteerListItem,
  ChangePasswordInput,
  AccountStatus,
  Role,
  DonationStatus,
  IncidentStatus,
  Priority,
  MapResponse,
  NearbyCamp,
  AlertStats,
  SmsLogItem,
  SubscribeAlertsInput,
  SubscribeAlertsResponse,
  VerifyAlertsInput,
} from '@crisislink/shared';
import { api } from './api';
import { offlineKeys, type CheckInVars, type ReportIncidentVars } from './offline';
import { meKey } from './auth';

/**
 * QUERY KEYS identify cached data. They are hierarchical arrays, so after a change we can
 * invalidate a whole family at once: invalidating ['camps'] refreshes every camp list AND
 * every single-camp entry. One place for all keys avoids typos and forgotten refreshes.
 */
type Params = Record<string, string | number | boolean | undefined>;
export const keys = {
  stats: ['stats'] as const,
  districts: ['districts'] as const,
  district: (slug: string) => ['districts', slug] as const,
  camps: (params: Params = {}) => ['camps', 'list', params] as const,
  camp: (id: string) => ['camps', 'detail', id] as const,
  campNeeds: (id: string) => ['needs', 'camp', id] as const,
  needs: (params: Params = {}) => ['needs', 'list', params] as const,
  evacuees: (campId: string, params: Params = {}) => ['evacuees', campId, params] as const,
  donations: (params: Params = {}) => ['donations', params] as const,
  incidents: (params: Params = {}) => ['incidents', 'list', params] as const,
  tasks: (params: Params = {}) => ['tasks', params] as const,
  users: (params: Params = {}) => ['users', params] as const,
  volunteers: (params: Params = {}) => ['volunteers', params] as const,
  map: (district?: string) => ['map', district ?? 'all'] as const,
  nearby: (params: Params) => ['nearby', params] as const,
};

// ---------- Public reads ----------

export const useStats = () =>
  useQuery({ queryKey: keys.stats, queryFn: () => api<StatsResponse>('/stats') });

export const useDistricts = () =>
  useQuery({
    queryKey: keys.districts,
    queryFn: () => api<{ items: DistrictSummary[] }>('/districts').then((r) => r.items),
  });

export const useDistrict = (slug: string) =>
  useQuery({
    queryKey: keys.district(slug),
    queryFn: () => api<DistrictSummary>(`/districts/${slug}`),
  });

export const useCamps = (params: Params = {}) =>
  useQuery({
    queryKey: keys.camps(params),
    queryFn: () => api<Paginated<CampSummary>>('/camps', { query: params }),
  });

export const useCamp = (id: string) =>
  useQuery({ queryKey: keys.camp(id), queryFn: () => api<CampSummary>(`/camps/${id}`) });

export const useCampNeeds = (campId: string) =>
  useQuery({
    queryKey: keys.campNeeds(campId),
    queryFn: () => api<{ items: CampNeed[] }>(`/camps/${campId}/needs`).then((r) => r.items),
  });

export const useNeeds = (params: Params = {}) =>
  useQuery({
    queryKey: keys.needs(params),
    queryFn: () => api<Paginated<CampNeed>>('/needs', { query: params }),
  });

export const useIncidents = (params: Params = {}) =>
  useQuery({
    queryKey: keys.incidents(params),
    queryFn: () => api<Paginated<Incident>>('/incidents', { query: params }),
  });

// ---------- Staff / user reads ----------

export const useEvacuees = (campId: string, params: Params = {}) =>
  useQuery({
    queryKey: keys.evacuees(campId, params),
    queryFn: () => api<Paginated<Evacuee>>(`/camps/${campId}/evacuees`, { query: params }),
  });

export const useDonations = (params: Params = {}, enabled = true) =>
  useQuery({
    queryKey: keys.donations(params),
    queryFn: () => api<Paginated<Donation>>('/donations', { query: params }),
    enabled,
  });

export const useTasks = (params: Params = {}) =>
  useQuery({
    queryKey: keys.tasks(params),
    queryFn: () => api<Paginated<Task>>('/tasks', { query: params }),
  });

export const useUsers = (params: Params = {}) =>
  useQuery({
    queryKey: keys.users(params),
    queryFn: () => api<Paginated<UserListItem>>('/users', { query: params }),
  });

export const useVolunteers = (params: Params = {}) =>
  useQuery({
    queryKey: keys.volunteers(params),
    queryFn: () => api<Paginated<VolunteerListItem>>('/volunteers', { query: params }),
  });

// ---------- Mutations ----------
// After a successful write we INVALIDATE the affected queries; TanStack Query refetches the
// ones currently on screen. Dashboards/stats are invalidated too because counts change.

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...prefixes: string[]) =>
    Promise.all(prefixes.map((p) => queryClient.invalidateQueries({ queryKey: [p] })));
}

export function usePledge() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateDonationInput) =>
      api<Donation>('/donations', { method: 'POST', body: input }),
    onSuccess: () => invalidate('donations'),
  });
}

/** Queueable offline: the request function and cache refresh live in lib/offline.ts. */
export const useReportIncident = () =>
  useMutation<Incident, Error, ReportIncidentVars>({ mutationKey: offlineKeys.reportIncident });

export function useUpdateIncident() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; status?: IncidentStatus; severity?: Priority }) =>
      api<Incident & { alertsQueued: number }>(`/incidents/${id}`, { method: 'PATCH', body }),
    onSuccess: () => invalidate('incidents', 'stats', 'districts', 'map'),
  });
}

export function useCreateCamp() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateCampInput) =>
      api<CampSummary>('/camps', { method: 'POST', body: input }),
    onSuccess: () => invalidate('camps', 'stats', 'districts'),
  });
}

export function useUpdateCamp(id: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: UpdateCampInput) =>
      api<CampSummary>(`/camps/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => invalidate('camps', 'stats', 'districts'),
  });
}

/** Queueable offline (see lib/offline.ts). */
export const useCheckIn = () =>
  useMutation<Evacuee, Error, CheckInVars>({ mutationKey: offlineKeys.checkIn });

export function useCheckOut() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      api<Evacuee>(`/evacuees/${id}`, { method: 'PATCH', body: { checkedOut: true } }),
    onSuccess: () => invalidate('evacuees', 'camps', 'stats', 'districts'),
  });
}

export function useAddNeed(campId: string) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateNeedInput) =>
      api<CampNeed>(`/camps/${campId}/needs`, { method: 'POST', body: input }),
    onSuccess: () => invalidate('needs', 'camps', 'stats'),
  });
}

export function useUpdateNeed() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateNeedInput & { id: string }) =>
      api<CampNeed>(`/needs/${id}`, { method: 'PATCH', body }),
    onSuccess: () => invalidate('needs', 'camps', 'stats'),
  });
}

export function useUpdateDonation() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Exclude<DonationStatus, 'PLEDGED'> }) =>
      api<Donation>(`/donations/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => invalidate('donations', 'needs', 'camps', 'stats'),
  });
}

export function useCreateTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api<Task>('/tasks', { method: 'POST', body: input }),
    onSuccess: () => invalidate('tasks'),
  });
}

export function useClaimTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api<Task>(`/tasks/${id}/claim`, { method: 'POST' }),
    onSettled: () => invalidate('tasks'), // refresh even on 409 "already taken"
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: UpdateTaskInput & { id: string }) =>
      api<Task>(`/tasks/${id}`, { method: 'PATCH', body }),
    onSettled: () => invalidate('tasks', 'volunteers'),
  });
}

export function useApproveVolunteer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => api<CurrentUser>(`/volunteers/${id}/approve`, { method: 'POST' }),
    onSuccess: () => invalidate('volunteers', 'users'),
  });
}

export function useUpdateUser() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; role?: Role; status?: AccountStatus }) =>
      api<CurrentUser>(`/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => invalidate('users', 'volunteers'),
  });
}

export function useSetUserCamps() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, campIds }: { id: string; campIds: string[] }) =>
      api<CurrentUser>(`/users/${id}/camps`, { method: 'PUT', body: { campIds } }),
    onSuccess: () => invalidate('users'),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      api<CurrentUser>('/auth/me', { method: 'PATCH', body: input }),
    onSuccess: (user) => queryClient.setQueryData(meKey, user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) =>
      api<{ ok: true; otherSessionsRevoked: number }>('/auth/change-password', {
        method: 'POST',
        body: input,
      }),
  });
}

// ---------- Maps ----------

export const useMapData = (district?: string) =>
  useQuery({
    queryKey: keys.map(district),
    queryFn: () => api<MapResponse>('/map', { query: { district } }),
  });

/** Closest camps to a point. Disabled until we know where the person is. */
export const useNearbyCamps = (point: { latitude: number; longitude: number } | null) =>
  useQuery({
    queryKey: keys.nearby({ lat: point?.latitude, lng: point?.longitude }),
    queryFn: () =>
      api<{ items: NearbyCamp[] }>('/camps/nearby', {
        query: { lat: point!.latitude, lng: point!.longitude, radiusKm: 100 },
      }).then((r) => r.items),
    enabled: point !== null,
  });

// ---------- SMS alerts ----------

export const useSubscribeAlerts = () =>
  useMutation({
    mutationFn: (input: SubscribeAlertsInput) =>
      api<SubscribeAlertsResponse>('/alerts/subscribe', { method: 'POST', body: input }),
  });

export const useVerifyAlerts = () =>
  useMutation({
    mutationFn: (input: VerifyAlertsInput) =>
      api<{ ok: true; district: { slug: string; name: string } }>('/alerts/verify', {
        method: 'POST',
        body: input,
      }),
  });

export const useAlertSubscription = (code: string) =>
  useQuery({
    queryKey: ['alertSubscription', code],
    queryFn: () => api<{ phone: string; district: string }>(`/alerts/subscription/${code}`),
  });

export const useUnsubscribeAlerts = () =>
  useMutation({
    mutationFn: (code: string) =>
      api<{ ok: true }>('/alerts/unsubscribe', { method: 'POST', body: { code } }),
  });

export const useSmsLog = (params: Params = {}) =>
  useQuery({
    queryKey: ['sms', params],
    queryFn: () => api<Paginated<SmsLogItem>>('/admin/sms', { query: params }),
    refetchInterval: 5000, // the worker sends in the background: watch statuses change
  });

export const useAlertStats = () =>
  useQuery({
    queryKey: ['sms', 'stats'],
    queryFn: () => api<AlertStats>('/admin/alerts/stats'),
    refetchInterval: 5000,
  });
