import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, KanbanSquare, FileText,
  Package, Settings, ChevronLeft, ChevronRight, ChevronDown, ShieldAlert, BadgeCheck, UserCog,
  Moon, Sun, Terminal, Check, Bot, ClipboardCheck, FileStack,
  Building, ScrollText, Server, FolderKanban, Library, BarChart3, LifeBuoy, Inbox, HardDrive,
  Radar, SlidersHorizontal, Menu, X
} from 'lucide-react';
import { useClient } from '@/lib/clientContext';
import { useAuth } from '@/lib/AuthContext';
import OrgSelector from '@/components/org/OrgSelector';
import { useTheme } from '@/lib/themeContext';
import AcceptanceGate from '@/components/legal/AcceptanceGate';
import ConfidentialityFooter from '@/components/legal/ConfidentialityFooter';
import BrandLogo from '@/components/branding/BrandLogo';
import { useBrand } from '@/lib/brandContext';

const navSections = [
  { label: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, clientVisible: true },
    { to: '/dashboards', label: 'Role Dashboards', icon: BarChart3, clientVisible: true },
    { to: '/projects', label: 'Projects', icon: FolderKanban, clientVisible: true },
    { to: '/clients', label: 'Clients', icon: Building2 },
    { to: '/intake', label: 'Client Intake', icon: ClipboardCheck, clientVisible: true },
    { to: '/board', label: 'Deployment Board', icon: KanbanSquare },
  ]},
  { label: 'Organization', items: [
    { to: '/org-settings', label: 'Organization Settings', icon: Building, clientVisible: true },
    { to: '/org-assets', label: 'Asset Inventory', icon: HardDrive, clientVisible: true },
    { to: '/audit-log', label: 'Audit Log', icon: ScrollText, clientVisible: true },
    { to: '/settings', label: 'Workspace Settings', icon: Settings },
  ]},
  { label: 'Compliance', items: [
    { to: '/documentation', label: 'SSP & Documentation', icon: FileStack },
    { to: '/documents', label: 'Document Library', icon: FileText },
    { to: '/piee', label: 'PIEE Self-Certification', icon: BadgeCheck },
    { to: '/package', label: 'Assessment Package', icon: Package },
  ]},
  { label: 'Assistance', items: [
    { to: '/assistant', label: 'AI Assistants', icon: Bot },
    { to: '/acolyte', label: 'ACOLYTE Operations', icon: Radar, clientVisible: true },
  ]},
  { label: 'Support', items: [
    { to: '/help', label: 'Help Center', icon: LifeBuoy, clientVisible: true },
  ]},
  { label: 'Administration', items: [
    { to: '/users', label: 'User Management', icon: UserCog, adminOnly: true },
    { to: '/support-inbox', label: 'Support Inbox', icon: Inbox },
    { to: '/control-library', label: 'Control Library', icon: Library, adminOnly: true },
    { to: '/policy-library', label: 'Policy Library', icon: ScrollText, adminOnly: true },
    { to: '/branding', label: 'Branding', icon: SlidersHorizontal, adminOnly: true },
    { to: '/saas-admin', label: 'Pac-Sec SaaS Admin', icon: Server, adminOnly: true },
  ]},
];

// Which section (by label) contains the currently active route.
function findActiveSection(pathname) {
  let best = null;
  let bestLen = -1;
  for (const section of navSections) {
    for (const item of section.items) {
      const isActive = item.end ? pathname === item.to : (pathname === item.to || pathname.startsWith(item.to + '/'));
      if (isActive && item.to.length > bestLen) { best = section.label; bestLen = item.to.length; }
    }
  }
  return best;
}

const SESSION_KEY = 'cmmc.sidebar.expanded';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { clients, selectedClientId, setSelectedClientId, selectedClient, loading } = useClient();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { branding, wordmark } = useBrand();
  const hasLogo = !!(branding?.logo_white_url || branding?.logo_dark_url || branding?.logo_color_url);
  const [themeOpen, setThemeOpen] = useState(false);

  // Expanded/collapsed state per section. Restore from session, default: Overview open.
  const [expanded, setExpanded] = useState(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return { Overview: true };
  });

  const activeSection = findActiveSection(location.pathname);
  const activePage = navSections
    .flatMap((section) => section.items)
    .filter((item) => item.end ? location.pathname === item.to : (location.pathname === item.to || location.pathname.startsWith(item.to + '/')))
    .sort((a, b) => b.to.length - a.to.length)[0];
  const currentPageTitle = activePage?.label || 'Kipuka Workspace';
  const userLabel = user?.full_name || user?.email || 'Kipuka User';
  const userInitials = userLabel
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  // Persist session state.
  useEffect(() => {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(expanded)); } catch { /* ignore */ }
  }, [expanded]);

  // Auto-expand the section that contains the active page.
  useEffect(() => {
    if (activeSection) {
      setExpanded((prev) => (prev[activeSection] ? prev : { ...prev, [activeSection]: true }));
    }
  }, [activeSection]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const toggleSection = (label) => setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-[68px]' : 'w-[248px]'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed lg:relative z-40 h-full bg-gradient-to-b from-[#0b1930] via-[#0e203b] to-[#091526] flex flex-col transition-all duration-300 flex-shrink-0 border-r border-white/5 shadow-2xl shadow-slate-950/20`}>
        <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-white/[0.08] px-4">
          {hasLogo ? (
            <BrandLogo variant="white" imgClassName={collapsed ? 'h-9 w-9 object-contain' : 'h-10 w-auto max-w-[190px] object-contain'} />
          ) : (
            <>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#479dcf]/15 ring-1 ring-[#77c2e9]/25">
                <ShieldAlert className="h-5 w-5 text-[#8fd0f2]" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-extrabold leading-tight tracking-tight text-white">{wordmark}</div>
                  <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white/40">CMMC Readiness Platform</div>
                </div>
              )}
            </>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
            className="ml-auto rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto px-2.5 py-3 ${collapsed ? 'space-y-3' : 'space-y-1'}`}> 
          {navSections.map((section) => {
            const visibleItems = section.items.filter(item =>
              (!item.adminOnly || user?.role === 'admin') &&
              (user?.role !== 'client' || item.clientVisible)
            );
            if (visibleItems.length === 0) return null;

            // Icon-only (collapsed sidebar): keep all icons visible, no headers — preserves prior behavior.
            if (collapsed) {
              return (
                <div key={section.label} className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        title={item.label}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `flex h-10 items-center justify-center rounded-xl text-sm transition-all ${
                            isActive ? 'bg-[#479dcf]/20 text-[#bfe8ff] ring-1 ring-[#6bb8e2]/25' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                      </NavLink>
                    );
                  })}
                </div>
              );
            }

            const isOpen = !!expanded[section.label];
            return (
              <div key={section.label}>
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  aria-expanded={isOpen}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.14em] transition-colors ${activeSection === section.label ? 'text-[#8fd0f2]' : 'text-white/35 hover:bg-white/[0.04] hover:text-white/65'}`}
                >
                  <span className="truncate">{section.label}</span>
                  <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                </button>
                {isOpen && (
                  <div className="space-y-0.5 mt-0.5">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
                              isActive
                                ? 'bg-[#479dcf]/20 font-semibold text-white ring-1 ring-[#6bb8e2]/20 before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-[#79c6ed]'
                                : 'text-white/55 hover:bg-white/[0.06] hover:text-white'
                            }`
                          }
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          type="button"
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className="hidden h-11 items-center justify-center border-t border-white/10 text-white/35 transition-colors hover:bg-white/[0.05] hover:text-white lg:flex"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-3 backdrop-blur-xl dark:border-slate-800 dark:bg-[#0d1828]/95 sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 lg:block">
              <div className="truncate text-sm font-extrabold text-slate-800">{currentPageTitle}</div>
            </div>
          </div>

          <div className="ml-auto flex min-w-0 items-center gap-2 lg:ml-4">
            <div className="hidden items-center border-r border-slate-200 pr-3 dark:border-slate-700 2xl:flex">
              <OrgSelector />
            </div>
            {user?.role !== 'client' && (
              <div className="min-w-0">
                <label htmlFor="active-client" className="sr-only">Active client</label>
              <select
                id="active-client"
                value={selectedClientId || ''}
                onChange={(e) => setSelectedClientId(e.target.value || null)}
                disabled={loading || clients.length === 0}
                className="h-10 w-[132px] truncate rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 shadow-sm transition-colors focus:border-[#479dcf] focus:outline-none focus:ring-2 focus:ring-[#479dcf]/20 disabled:opacity-60 sm:w-[190px] xl:w-[230px]"
              >
                {clients.length === 0 && <option value="">No clients yet</option>}
                {(user?.role === 'admin' || user?.role === 'technician') && clients.length > 0 && <option value="">All Clients ({user.role === 'admin' ? 'Admin' : 'Technician'})</option>}
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.legal_name}</option>
                ))}
                </select>
              </div>
            )}
            {selectedClient && (
              <span className="app-pill hidden xl:inline-flex">
                <span className={`h-1.5 w-1.5 rounded-full ${selectedClient.project_status === 'Complete' ? 'bg-emerald-500' : selectedClient.project_status === 'In Progress' ? 'bg-[#479dcf]' : 'bg-slate-400'}`} />
                {selectedClient.project_status}
              </span>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 border-l border-slate-200 pl-2 dark:border-slate-700">
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeOpen(!themeOpen)}
                aria-label="Change color theme"
                className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                {theme === 'light' ? <Sun className="h-4 w-4" /> : theme === 'dark-green' ? <Terminal className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                <span className="hidden 2xl:inline">{theme === 'dark-green' ? 'Green' : theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
              {themeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
                  <div className="app-surface absolute right-0 z-50 mt-2 w-48 overflow-hidden p-1.5">
                    {[
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'dark-green', label: 'Dark (Green)', icon: Terminal },
                      { value: 'light', label: 'Light', icon: Sun },
                    ].map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => { setTheme(opt.value); setThemeOpen(false); }}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-colors ${theme === opt.value ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {opt.label}
                          {theme === opt.value && <Check className="ml-auto h-3.5 w-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 rounded-xl p-1.5 pr-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#479dcf] to-[#286d98] text-[10px] font-extrabold text-white shadow-sm">
                {userInitials || 'KU'}
              </div>
              <div className="hidden min-w-0 2xl:block">
                <div className="max-w-[140px] truncate text-xs font-extrabold text-slate-800">{userLabel}</div>
                <div className="text-[10px] font-semibold capitalize text-slate-400">{user?.role || 'member'}</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <AcceptanceGate>
          <main className="app-content flex flex-1 flex-col overflow-y-auto">
            <div className="flex-1 p-4 sm:p-5 lg:p-6 2xl:p-7">
              <div className="mx-auto w-full max-w-[1440px]">
                <Outlet key={selectedClientId || 'all-clients'} />
              </div>
            </div>
            <ConfidentialityFooter />
          </main>
        </AcceptanceGate>
      </div>
    </div>
  );
}