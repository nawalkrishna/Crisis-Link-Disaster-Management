import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CurrentUser, LoginInput, RegisterInput } from '@crisislink/shared';
import { api, isApiError } from './api';
import { reconnectLive } from './socket';

/**
 * "Who is logged in?" is just another piece of server state: GET /auth/me.
 * A 401 means "nobody" -> null. Login/logout update this cache entry, and every
 * component that calls useCurrentUser() re-renders automatically.
 */
export const meKey = ['auth', 'me'] as const;

export function useCurrentUser() {
  return useQuery({
    queryKey: meKey,
    queryFn: async () => {
      try {
        return await api<CurrentUser>('/auth/me');
      } catch (err) {
        if (isApiError(err, 401)) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      api<CurrentUser>('/auth/login', { method: 'POST', body: input }),
    onSuccess: (user) => {
      // Data cached while logged out (or as someone else) may now be incomplete: refetch it.
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'auth' });
      queryClient.setQueryData(meKey, user);
      reconnectLive(); // the live connection should now know who we are
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api<CurrentUser>('/auth/register', { method: 'POST', body: input }),
    onSuccess: (user) => {
      queryClient.setQueryData(meKey, user);
      reconnectLive(); // join our personal room, so "you've been approved" reaches us
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      // Forget everything cached for this user (evacuee lists, donor phones...).
      queryClient.clear();
      queryClient.setQueryData(meKey, null);
      reconnectLive();
    },
  });
}

// ---------- Role helpers (mirror apps/api/src/auth/policies.ts) ----------

export const isActive = (user?: CurrentUser | null): user is CurrentUser =>
  user?.status === 'ACTIVE';
export const isStaff = (user?: CurrentUser | null): user is CurrentUser =>
  isActive(user) && (user.role === 'ADMIN' || user.role === 'COORDINATOR');
export const isAdmin = (user?: CurrentUser | null): user is CurrentUser =>
  isActive(user) && user.role === 'ADMIN';
export const managesCamp = (user: CurrentUser | null | undefined, campId: string) =>
  isActive(user) && (user.role === 'ADMIN' || user.campIds.includes(campId));
