// Diagram node seeding + iconography for the network / data-flow diagram builder.
// Nodes are seeded from the existing Asset inventory. ESPs / cloud services are
// flagged external so the canvas can render them outside the boundary.

// Map an Asset.asset_type to a node_type + whether it is external.
export function nodeTypeForAsset(asset) {
  const t = asset.asset_type;
  const external = t === 'External Provider' || t === 'Cloud Service' || t === 'SaaS Application';
  let node_type = 'endpoint';
  switch (t) {
    case 'Server': node_type = 'server'; break;
    case 'Network Device': node_type = 'network'; break;
    case 'Cloud Service': node_type = 'cloud'; break;
    case 'SaaS Application': node_type = 'saas'; break;
    case 'External Provider': node_type = 'external'; break;
    case 'Security Tool': node_type = 'security'; break;
    case 'Data Repository': node_type = 'data'; break;
    case 'Facility': node_type = 'facility'; break;
    case 'User': node_type = 'user'; break;
    default: node_type = 'endpoint';
  }
  return { node_type, external };
}

// Node visual metadata (color + label). Lucide icon names resolved in the component.
export const NODE_META = {
  endpoint: { label: 'Endpoint', color: '#2563eb', icon: 'Laptop' },
  server: { label: 'Server', color: '#0f766e', icon: 'Server' },
  network: { label: 'Network', color: '#7c3aed', icon: 'Network' },
  cloud: { label: 'Cloud', color: '#0284c7', icon: 'Cloud' },
  saas: { label: 'SaaS', color: '#0891b2', icon: 'AppWindow' },
  external: { label: 'External Provider', color: '#b45309', icon: 'Globe' },
  security: { label: 'Security Tool', color: '#dc2626', icon: 'ShieldCheck' },
  data: { label: 'Data Repository', color: '#4338ca', icon: 'Database' },
  facility: { label: 'Facility', color: '#475569', icon: 'Building2' },
  user: { label: 'User', color: '#059669', icon: 'User' },
};

export const ZONE_TYPES = [
  { value: 'scope', label: 'Assessment Scope Boundary', color: '#2563eb' },
  { value: 'cui', label: 'CUI Enclave', color: '#dc2626' },
  { value: 'out', label: 'Out of Scope', color: '#64748b' },
];

export function zoneMeta(type) {
  return ZONE_TYPES.find((z) => z.value === type) || ZONE_TYPES[0];
}

// Build initial nodes laid out in a simple grid. Internal nodes go on the left/
// center, external nodes to the right.
export function seedNodesFromAssets(assets) {
  const internal = [];
  const external = [];
  assets.forEach((a) => {
    const { node_type, external: isExt } = nodeTypeForAsset(a);
    const node = {
      id: `asset-${a.id}`,
      asset_id: a.id,
      label: a.asset_name,
      node_type,
      external: isExt,
      x: 0, y: 0,
    };
    (isExt ? external : internal).push(node);
  });

  const place = (list, startX) => list.forEach((n, i) => {
    n.x = startX + (i % 3) * 150;
    n.y = 80 + Math.floor(i / 3) * 110;
  });
  place(internal, 60);
  place(external, 620);
  return [...internal, ...external];
}