import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, KanbanSquare, ShieldCheck, Layers, Settings2,
  Cloud, ArrowLeftRight, FolderArchive, Monitor, Image, FileText, ListChecks,
  Package, Settings, ChevronLeft, ChevronRight, ShieldAlert, BadgeCheck, UserCog,
  Moon, Sun, Terminal, Check, Bot, ClipboardCheck, FileStack, ClipboardList,
  Building, ScrollText, Server, FolderKanban, Library, BarChart3, LifeBuoy, Inbox,
  Radar, ClipboardCheck as ReviewIcon, AlertTriangle, Wrench, Siren, FileBarChart, SlidersHorizontal
} from 'lucide-react';
import { useClient } from '@/lib/clientContext';
import { useAuth } from '@/lib/AuthContext';
import OrgSelector from '@/components/org/OrgSelector';
import { useTheme } from '@/lib/themeContext';
import WarningBanner from '@/components/WarningBanner';
import AcceptanceGate from '@/components/legal/AcceptanceGate';
import ConfidentialityFooter from '@/components/legal/ConfidentialityFooter';

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
    { to: '/audit-log', label: 'Audit Log', icon: ScrollText, clientVisible: true },
  ]},
  { label: 'CMMC Controls', items: [
    { to: '/controls', label: 'Level 1 Controls', icon: ShieldCheck },
    { to: '/level2', label: 'Level 2 Controls', icon: Layers },
    { to: '/jira-export', label: 'Jira Export', icon: ClipboardList },
  ]},
  { label: 'Implementation', items: [
    { to: '/m365', label: 'Microsoft 365 Setup', icon: Settings2 },
    { to: '/google', label: 'Google Migration', icon: ArrowLeftRight },
    { to: '/sharepoint', label: 'SharePoint Archive', icon: FolderArchive },
    { to: '/ninjaone', label: 'NinjaOne Evidence', icon: Monitor },
  ]},
  { label: 'Evidence', items: [
    { to: '/screenshots', label: 'Screenshot Library', icon: Image },
    { to: '/documentation', label: 'SSP & Documentation', icon: FileStack },
    { to: '/documents', label: 'Document Library', icon: FileText },
    { to: '/evidence', label: 'Evidence Index', icon: ListChecks },
  ]},
  { label: 'Delivery', items: [
    { to: '/piee', label: 'PIEE Self-Cert', icon: BadgeCheck },
    { to: '/package', label: 'Final Package', icon: Package },
    { to: '/sharepoint-package', label: 'SharePoint Package', icon: FolderArchive },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]},
  { label: 'AI Assistants', items: [
    { to: '/assistant', label: 'AI Assistants', icon: Bot },
  ]},
  { label: 'ACOLYTE Operations', items: [
    { to: '/acolyte', label: 'Cyber Overview', icon: Radar, clientVisible: true },
    { to: '/acolyte/reviews', label: 'Readiness Reviews', icon: ReviewIcon, clientVisible: true },
    { to: '/acolyte/findings', label: 'Cyber Findings', icon: AlertTriangle, clientVisible: true },
    { to: '/acolyte/remediation', label: 'Remediation Queue', icon: Wrench, clientVisible: true },
    { to: '/acolyte/incident-readiness', label: 'Incident Readiness', icon: Siren, clientVisible: true },
    { to: '/acolyte/reports', label: 'Executive Reports', icon: FileBarChart, clientVisible: true },
    { to: '/acolyte/settings', label: 'ACOLYTE Settings', icon: SlidersHorizontal, clientVisible: true },
  ]},
  { label: 'Support', items: [
    { to: '/help', label: 'Help Center', icon: LifeBuoy, clientVisible: true },
  ]},
  { label: 'Administration', items: [
    { to: '/users', label: 'User Management', icon: UserCog, adminOnly: true },
    { to: '/support-inbox', label: 'Support Inbox', icon: Inbox },
    { to: '/control-library', label: 'Control Library', icon: Library, adminOnly: true },
    { to: '/saas-admin', label: 'Pac-Sec SaaS Admin', icon: Server, adminOnly: true },
  ]},
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { clients, selectedClientId, setSelectedClientId, selectedClient, loading } = useClient();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F1F4F8] overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed lg:relative z-40 h-full bg-[#0F1E3C] flex flex-col transition-all duration-300 flex-shrink-0`}>
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-white font-bold text-sm leading-tight truncate">CMMC Command Center</div>
              <div className="text-white/50 text-[10px] leading-tight">Deployment &amp; Evidence Platform</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navSections.map((section) => {
            const visibleItems = section.items.filter(item =>
              (!item.adminOnly || user?.role === 'admin') &&
              (user?.role !== 'client' || item.clientVisible)
            );
            if (visibleItems.length === 0) return null;
            return (
            <div key={section.label}>
              {!collapsed && (
                <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-3 mb-1.5">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? 'bg-white/15 text-white font-medium'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  );
                })}
              </div>
            </div>
            );
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-10 border-t border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center pr-3 mr-1 border-r border-slate-200">
              <OrgSelector />
            </div>
            <span className="text-sm font-medium text-slate-500 hidden sm:inline">Active Client:</span>
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value || null)}
              disabled={loading || clients.length === 0}
              className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[200px]"
            >
              {clients.length === 0 && <option value="">No clients yet</option>}
              {(user?.role === 'admin' || user?.role === 'technician') && clients.length > 0 && <option value="">All Clients ({user.role === 'admin' ? 'Admin' : 'Technician'})</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.legal_name}</option>
              ))}
            </select>
            {selectedClient && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                <span className={`w-1.5 h-1.5 rounded-full ${selectedClient.project_status === 'Complete' ? 'bg-green-500' : selectedClient.project_status === 'In Progress' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                {selectedClient.project_status}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setThemeOpen(!themeOpen)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {theme === 'light' ? <Sun className="w-4 h-4" /> : theme === 'dark-green' ? <Terminal className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="hidden sm:inline">{theme === 'dark-green' ? 'Green' : theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
              {themeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg border border-slate-200 shadow-lg z-50 py-1">
                    {[
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'dark-green', label: 'Dark (Green)', icon: Terminal },
                      { value: 'light', label: 'Light', icon: Sun },
                    ].map(opt => {
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => { setTheme(opt.value); setThemeOpen(false); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {opt.label}
                          {theme === opt.value && <Check className="w-3.5 h-3.5 ml-auto text-blue-600" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-[#0F1E3C] text-white text-xs font-bold flex items-center justify-center">
              CMMC
            </div>
          </div>
        </header>

        {/* Page content */}
        <AcceptanceGate>
          <main className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1 p-4 lg:p-6">
              <div className="max-w-7xl mx-auto">
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