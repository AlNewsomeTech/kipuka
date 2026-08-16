import { filenameSegment } from './evidenceFilename.js';
import { neutralizeCustomerArtifactText } from './captureInstructions.js';

const KNOWN_LOCATIONS = [
  [/defender xdr|microsoft defender xdr/i, 'DefenderXDR'],
  [/intune|endpoint manager/i, 'Intune'],
  [/entra|azure ad|conditional access/i, 'Entra'],
  [/microsoft sentinel|sentinel/i, 'MicrosoftSentinel'],
  [/microsoft 365|office 365|m365/i, 'Microsoft365'],
  [/defender/i, 'MicrosoftDefender'],
  [/purview/i, 'MicrosoftPurview'],
  [/exchange/i, 'ExchangeOnline'],
  [/sharepoint/i, 'SharePoint'],
  [/teams/i, 'MicrosoftTeams'],
  [/ninjaone|ninja one/i, 'NinjaOne'],
  [/preveil/i, 'PreVeil'],
  [/cortex/i, 'CortexXDR'],
  [/palo alto/i, 'PaloAlto'],
  [/google workspace/i, 'GoogleWorkspace'],
];

const CREATION_ACTION = /\b(create|add|build|define|save|publish|deploy|establish|set up|configure)\b/i;
const REMEDIATION_ONLY = /\b(POA&M|Needs Work|corrective action|failed setting|failure handling)\b/i;
const ARTIFACT_TYPES = [
  [/custom detection(?: rule)?/i, 'CustomDetectionRule', 'Custom detection rule'],
  [/analytics rule/i, 'AnalyticsRule', 'Analytics rule'],
  [/detection rule/i, 'DetectionRule', 'Detection rule'],
  [/conditional access policy/i, 'ConditionalAccessPolicy', 'Conditional Access policy'],
  [/data loss prevention|\bDLP\b/i, 'DataLossPreventionPolicy', 'Data Loss Prevention policy'],
  [/compliance policy/i, 'CompliancePolicy', 'Compliance policy'],
  [/app protection policy/i, 'AppProtectionPolicy', 'App protection policy'],
  [/configuration profile/i, 'ConfigurationProfile', 'Configuration profile'],
  [/security baseline/i, 'SecurityBaseline', 'Security baseline'],
  [/terms of use/i, 'TermsOfUse', 'Terms of use'],
  [/access package/i, 'AccessPackage', 'Access package'],
  [/retention policy/i, 'RetentionPolicy', 'Retention policy'],
  [/alert rule/i, 'AlertRule', 'Alert rule'],
  [/correlation rule/i, 'CorrelationRule', 'Correlation rule'],
  [/(?:saved?\s+(?:an?\s+)?(?:advanced hunting\s+)?quer(?:y|ies)|save\s+the\s+query|advanced hunting query)/i, 'HuntingQuery', 'Saved hunting query'],
  [/sensitivity label/i, 'SensitivityLabel', 'Sensitivity label'],
  [/authentication strength/i, 'AuthenticationStrength', 'Authentication strength'],
  [/named location/i, 'NamedLocation', 'Named location'],
  [/app registration/i, 'AppRegistration', 'App registration'],
  [/workbook/i, 'Workbook', 'Workbook'],
  [/alert queue/i, 'AlertQueue', 'Alert queue'],
  [/native report/i, 'Report', 'Report'],
  [/\bpolicy\b/i, 'Policy', 'Policy'],
  [/\brule\b/i, 'Rule', 'Rule'],
  [/\bprofile\b/i, 'Profile', 'Profile'],
  [/\bplan\b/i, 'Plan', 'Plan'],
  [/\bprocedure\b/i, 'Procedure', 'Procedure'],
  [/\bstandard\b/i, 'Standard', 'Standard'],
  [/\bbaseline\b/i, 'Baseline', 'Baseline'],
  [/\bmatrix\b/i, 'Matrix', 'Matrix'],
  [/\bworkflow\b/i, 'Workflow', 'Workflow'],
  [/\btemplate\b/i, 'Template', 'Template'],
  [/\bconnector\b/i, 'Connector', 'Connector'],
  [/\bgroup\b/i, 'SecurityGroup', 'Security group'],
  [/\baccount\b/i, 'Account', 'Account'],
];

function knownLocation(source) {
  return KNOWN_LOCATIONS.find(([pattern]) => pattern.test(source || ''))?.[1] || '';
}

function locationFor(variant, project, stepText = '') {
  const source = [
    stepText,
    variant?.where_to_go?.name,
    variant?.tool_name,
    variant?.source_tool,
    project?.implementation_stack,
  ].filter(Boolean).join(' ');
  const known = knownLocation(source);
  if (known) return known;
  const neutralLocation = neutralizeCustomerArtifactText(
    variant?.where_to_go?.name || project?.implementation_stack,
    'PolicyLibrary',
  );
  if (/project workspace/i.test(neutralLocation)) return 'PolicyLibrary';
  return filenameSegment(neutralLocation, 'PolicyLibrary');
}

function policyTypeFor(libEntry) {
  return filenameSegment(libEntry?.control_title, 'PolicyType').replace(/_/g, '');
}

const GENERIC_ARTIFACT_TYPES = new Set([
  'Policy', 'Rule', 'Profile', 'Plan', 'Procedure', 'Standard', 'Baseline',
  'Matrix', 'Workflow', 'Template', 'Connector', 'SecurityGroup', 'Account',
]);

export function namingSteps(variant) {
  return (Array.isArray(variant?.steps) ? variant.steps : [])
    .map((step, index) => ({ step: String(step || ''), index }))
    .filter(({ step }) => CREATION_ACTION.test(step) && !REMEDIATION_ONLY.test(step))
    .flatMap(({ step, index }) => {
      const matches = ARTIFACT_TYPES.filter(([pattern]) => pattern.test(step));
      const specific = matches.filter((artifact) => !GENERIC_ARTIFACT_TYPES.has(artifact[1]));
      const selected = specific.length > 0 ? specific : matches;
      return selected.map((artifact) => ({
        index,
        text: step,
        artifact_type: artifact[1],
        label: artifact[2],
      }));
    });
}

function derivedSpecs({ libEntry, variant, project }) {
  const controlType = policyTypeFor(libEntry);
  const byKey = new Map();
  for (const item of namingSteps(variant)) {
    const location = locationFor(variant, project, item.text);
    const combinedType = controlType.toLowerCase().includes(item.artifact_type.toLowerCase())
      ? controlType
      : `${controlType}${item.artifact_type}`;
    const key = `${combinedType}|${location}|${item.label}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.step_indexes.push(item.index);
    } else {
      byKey.set(key, {
        label: item.label,
        policy_type: combinedType,
        location,
        step_indexes: [item.index],
      });
    }
  }
  return [...byKey.values()];
}

export function shouldShowPolicyNames(libEntry, variant) {
  if (Array.isArray(variant?.policy_names) && variant.policy_names.length > 0) return true;
  if (namingSteps(variant).length > 0) return true;
  return Array.isArray(libEntry?.related_policy_templates) && libEntry.related_policy_templates.length > 0;
}

export function buildPolicyNames({
  organization,
  project,
  libEntry,
  variant,
  date = new Date().toISOString().slice(0, 10),
}) {
  const company = filenameSegment(
    organization?.legal_name || organization?.organization_name || organization?.short_name || project?.project_name,
    'CompanyName',
  );
  const controlId = filenameSegment(libEntry?.control_id, 'CONTROLID');
  const defaultLocation = locationFor(variant, project);
  const configured = Array.isArray(variant?.policy_names) ? variant.policy_names : [];
  const creationIndexes = namingSteps(variant).map((item) => item.index);
  const specs = configured.length > 0
    ? configured.map((spec) => ({
        ...spec,
        step_indexes: Array.isArray(spec?.step_indexes) && spec.step_indexes.length > 0
          ? spec.step_indexes
          : creationIndexes,
      }))
    : derivedSpecs({ libEntry, variant, project });

  const fallbackSpecs = specs.length > 0
    ? specs
    : [{ policy_type: policyTypeFor(libEntry), location: defaultLocation, step_indexes: [] }];

  return fallbackSpecs.map((spec) => {
    const policyType = filenameSegment(
      neutralizeCustomerArtifactText(spec?.policy_type, policyTypeFor(libEntry)),
      policyTypeFor(libEntry),
    );
    const location = filenameSegment(
      neutralizeCustomerArtifactText(spec?.location, defaultLocation),
      defaultLocation,
    );
    return {
      label: neutralizeCustomerArtifactText(
        spec?.label || spec?.policy_type || libEntry?.control_title,
        'Policy',
      ),
      value: [company, policyType, controlId, location, date].join('_'),
      stepIndexes: Array.isArray(spec?.step_indexes) ? spec.step_indexes : [],
    };
  });
}

export const POLICY_NAME_FORMAT =
  'CompanyName_PolicyType_CONTROLID_ControlLocation_YYYY-MM-DD';
