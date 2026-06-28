import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * Restricts a group of routes to specific roles.
 * Client-role users are limited to read-only pages (dashboard + intake);
 * any attempt to reach an editable page by URL redirects them to the dashboard.
 */
export default function RoleRoute({ allow }) {
  const { user } = useAuth();
  const role = user?.role;

  if (role && allow && !allow.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}