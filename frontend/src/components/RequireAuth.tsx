import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { homePathFor, useAuth } from '../hooks/useAuth';
import type { Role } from '../types';
import { LoadingState } from './ui/States';

/**
 * Route guard. This is only for UX — the backend independently checks the JWT
 * and the role on every request, so hiding a route here is not the security boundary.
 */
export function RequireAuth({ role, children }: { role: Role; children: ReactNode }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return <LoadingState label="Checking your session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (user.role !== role) return <Navigate to={homePathFor(user)} replace />;
  return <>{children}</>;
}
