import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, KanbanSquare, ShieldCheck, Layers, Settings2,
  Cloud, ArrowLeftRight, FolderArchive, Monitor, Image, FileText, ListChecks,
  Package, Settings, ChevronLeft, ChevronRight, ShieldAlert
} from 'lucide-react';
import { useClient } from '@/lib/clientContext';
import WarningBanner from '@/components/WarningBanner';

const navSections = [
  { label: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/clients', label: 'Clients', icon: Building2 },
    { to: '/board', label: 'Deployment Board', icon: KanbanSquare },
  ]},
  { label: 'CMMC Controls', items: [
    { to: '/controls', label: 'Level 1 Controls', icon: ShieldCheck },
    { to: '/level2', label: 'Level 2 Readiness', icon: Layers },
  ]},
  { label: 'Implementation', items: [
    { to: '/m365', label: 'Microsoft 365 Setup', icon: Settings2 },
    { to: '/google', label: 'Google Migration', icon: ArrowLeftRight },
    { to: '/sharepoint', label: 'SharePoint Archive', icon: FolderArchive },
    { to: '/ninjaone', label: 'NinjaOne Evidence', icon: Monitor },
  ]},
  { label: 'Evidence', items: [
    { to: '/screenshots', label: 'Screenshot Library', icon: Image },
    { to: '/documents', label: 'Document Library', icon: FileText },
    { to: '/evidence', label: 'Evidence Index', icon: ListChecks },
  ]},
  { label: 'Delivery', items: [
    { to: '/package', label: 'Final Package', icon: Package },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]},
];

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { clients, selectedClientId, setSelectedClientId, selectedClient, loading } = useClient();

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
              <div className="text-white font-bold text-sm leading-tight truncate">CMMC Command</div>
              <div className="text-white/50 text-[10px] leading-tight">Deployment Center</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <div className="text-[10px] font-semibold text-white/40 uppercase tracking-wider px-3 mb-1.5">
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
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
          ))}
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
            <span className="text-sm font-medium text-slate-500 hidden sm:inline">Active Client:</span>
            <select
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value)}
              disabled={loading || clients.length === 0}
              className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[200px]"
            >
              {clients.length === 0 && <option value="">No clients yet</option>}
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

          <div className="flex items-center gap-2">
            <span className="hidden md:inline text-xs text-slate-400">Level 1 First</span>
            <div className="w-8 h-8 rounded-full bg-[#0F1E3C] text-white text-xs font-bold flex items-center justify-center">
              CMMC
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}