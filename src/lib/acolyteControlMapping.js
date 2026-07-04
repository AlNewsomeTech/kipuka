// Automatic audit mapping: each ACOLYTE finding category maps to the CMMC
// Level 2 (NIST SP 800-171) control IDs it most directly relates to. Used to
// auto-suggest related controls on findings so audit traceability is captured
// without manual mapping. IDs match src/lib/controlLibraryLevel2Seed.js.
export const FINDING_CATEGORY_TO_L2_CONTROLS = {
  'Endpoint Security': ['CM.L2-3.4.1', 'CM.L2-3.4.2', 'CM.L2-3.4.6', 'CM.L2-3.4.7', 'CM.L2-3.4.8', 'CM.L2-3.4.9', 'SI.L2-3.14.3', 'SI.L2-3.14.6', 'SI.L2-3.14.7'],
  'Cloud Security': ['AC.L2-3.1.3', 'AC.L2-3.1.12', 'AC.L2-3.1.13', 'AC.L2-3.1.20', 'SC.L2-3.13.6', 'SC.L2-3.13.8', 'SC.L2-3.13.11', 'SC.L2-3.13.16'],
  'Identity and Access': ['AC.L2-3.1.4', 'AC.L2-3.1.5', 'AC.L2-3.1.6', 'AC.L2-3.1.7', 'AC.L2-3.1.8', 'IA.L2-3.5.3', 'IA.L2-3.5.4', 'IA.L2-3.5.7', 'IA.L2-3.5.10'],
  'Vulnerability': ['RA.L2-3.11.1', 'RA.L2-3.11.2', 'RA.L2-3.11.3', 'CM.L2-3.4.4', 'SI.L2-3.14.3'],
  'Logging and Monitoring': ['AU.L2-3.3.1', 'AU.L2-3.3.2', 'AU.L2-3.3.3', 'AU.L2-3.3.4', 'AU.L2-3.3.5', 'AU.L2-3.3.6', 'AU.L2-3.3.8', 'SI.L2-3.14.6'],
  'Incident Response': ['IR.L2-3.6.1', 'IR.L2-3.6.2', 'IR.L2-3.6.3'],
  'Backup and Recovery': ['MP.L2-3.8.9', 'CM.L2-3.4.1'],
  'User Awareness': ['AT.L2-3.2.1', 'AT.L2-3.2.2', 'AT.L2-3.2.3'],
  'Compliance Alignment': ['CA.L2-3.12.1', 'CA.L2-3.12.2', 'CA.L2-3.12.3', 'CA.L2-3.12.4'],
  'Other': [],
};

// Returns the suggested CMMC Level 2 control IDs for a finding category.
export function suggestedControlsForCategory(category) {
  return FINDING_CATEGORY_TO_L2_CONTROLS[category] || [];
}