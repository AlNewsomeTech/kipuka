// Determines whether the current viewer sees the simplified "client" experience
// (four simple statuses, grouped nav, guided-first control rows) versus the full
// consultant experience (13-status taxonomy, full 17-module nav, all row actions).
//
// Client-facing = a customer-org role. Pac-Sec Admin/Support and platform admins
// are consultants and keep the full experience untouched.
import { isPacSec } from '@/lib/orgRoles';

export function isClientView(orgRole, isPlatformAdmin) {
  if (isPlatformAdmin) return false;
  if (isPacSec(orgRole)) return false;
  return !!orgRole; // any customer-org role
}