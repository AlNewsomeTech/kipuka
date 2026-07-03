import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { isPacSec, roleHasPerm, isReadOnly } from '@/lib/orgRoles';
import { tierHasFeature, tierLimit } from '@/lib/subscriptionTiers';

const OrgContext = createContext(null);

const LS_KEY = 'pacsec_selected_org';

export function OrgProvider({ children }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [memberships, setMemberships] = useState([]); // OrganizationUser records for this user
  const [organizations, setOrganizations] = useState([]); // Organization records the user can access
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const emailLower = (user.email || '').toLowerCase();
      const [allOrgs, myMemberships] = await Promise.all([
        base44.entities.Organization.list('-created_date', 500).catch(() => []),
        base44.entities.OrganizationUser.filter({ user_email: user.email }).catch(() => []),
      ]);

      // App-level admins are treated as Pac-Sec Admins (platform owners).
      const platformAdmin = user.role === 'admin' ||
        myMemberships.some((m) => m.role === 'Pac-Sec Admin');
      setIsPlatformAdmin(platformAdmin);

      const activeMemberships = myMemberships.filter((m) => m.status !== 'Removed');
      setMemberships(activeMemberships);

      let accessible;
      if (platformAdmin) {
        accessible = allOrgs;
      } else {
        const supportOrgIds = new Set(
          activeMemberships.filter((m) => m.role === 'Pac-Sec Support').map((m) => m.organization_id)
        );
        const memberOrgIds = new Set(activeMemberships.map((m) => m.organization_id));
        accessible = allOrgs.filter((o) => memberOrgIds.has(o.id) || supportOrgIds.has(o.id));
      }
      setOrganizations(accessible);

      const stored = localStorage.getItem(LS_KEY);
      if (stored && accessible.some((o) => o.id === stored)) {
        setSelectedOrgId(stored);
      } else if (accessible.length === 1) {
        setSelectedOrgId(accessible[0].id);
      } else if (!platformAdmin && accessible.length > 1) {
        // leave null to force selector
        setSelectedOrgId(null);
      }
      void emailLower;
    } catch (e) {
      console.warn('Org context load failed:', e?.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const selectOrg = (orgId) => {
    setSelectedOrgId(orgId);
    if (orgId) localStorage.setItem(LS_KEY, orgId);
    else localStorage.removeItem(LS_KEY);
  };

  const selectedOrg = organizations.find((o) => o.id === selectedOrgId) || null;

  // The current user's role within the selected org.
  const membershipForSelected = memberships.find((m) => m.organization_id === selectedOrgId);
  const orgRole = isPlatformAdmin
    ? 'Pac-Sec Admin'
    : (membershipForSelected?.role || null);

  // ---- Derived helpers scoped to the selected org ----
  const tier = selectedOrg?.subscription_tier || 'Trial';
  const status = selectedOrg?.subscription_status || 'Trial';
  const suspended = status === 'Suspended' || status === 'Cancelled' || status === 'Past Due';
  const fullyDisabled = selectedOrg?.fully_disabled === true;
  const expired = !!selectedOrg?.subscription_end_date &&
    new Date(selectedOrg.subscription_end_date) < new Date();

  const hasFeature = (feature) => tierHasFeature(tier, feature);
  const can = (perm) => (orgRole ? roleHasPerm(orgRole, perm) : false);
  const readOnly = isReadOnly(orgRole) || suspended || expired;
  const limit = (key) => tierLimit(tier, key);

  const value = {
    loading,
    organizations,
    memberships,
    selectedOrg,
    selectedOrgId,
    selectOrg,
    orgRole,
    isPlatformAdmin,
    isPacSec: isPacSec(orgRole) || isPlatformAdmin,
    tier,
    status,
    suspended,
    expired,
    fullyDisabled,
    hasFeature,
    can,
    readOnly,
    limit,
    refreshOrgs: load,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}