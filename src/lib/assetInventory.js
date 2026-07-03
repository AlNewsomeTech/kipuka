// Asset inventory page definitions. Each inventory page filters Asset records by
// the asset_type(s) it covers. Pure data.
import { Users, Laptop, Server, Cloud, AppWindow, Building2, Database, Network } from 'lucide-react';

export const INVENTORY_PAGES = [
  { key: 'users', label: 'Users', icon: Users, types: ['User'] },
  { key: 'endpoints', label: 'Endpoints', icon: Laptop, types: ['Endpoint'] },
  { key: 'servers', label: 'Servers', icon: Server, types: ['Server', 'Network Device'] },
  { key: 'cloud', label: 'Cloud Services', icon: Cloud, types: ['Cloud Service'] },
  { key: 'saas', label: 'SaaS Applications', icon: AppWindow, types: ['SaaS Application'] },
  { key: 'providers', label: 'External Providers', icon: Network, types: ['External Provider'] },
  { key: 'facilities', label: 'Facilities', icon: Building2, types: ['Facility'] },
  { key: 'repositories', label: 'Data Repositories', icon: Database, types: ['Data Repository'] },
];

export const ASSET_TYPES = [
  'User', 'Endpoint', 'Server', 'Network Device', 'Cloud Service', 'SaaS Application',
  'Security Tool', 'Facility', 'External Provider', 'Data Repository', 'Other',
];

export const SCOPE_CATEGORIES = [
  'CUI Asset', 'Security Protection Asset', 'Contractor Risk Managed Asset',
  'Specialized Asset', 'Out of Scope', 'Unknown',
];

export const ASSET_STATUSES = ['Active', 'Planned', 'Retired', 'Unknown'];

export function inventoryPageByKey(key) {
  return INVENTORY_PAGES.find((p) => p.key === key) || INVENTORY_PAGES[0];
}