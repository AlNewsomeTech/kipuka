// Automated legacy cleanup must not downgrade newer or manually reviewed directions.
export function canAutoRewriteVariant(variant: any, targetVersion: number): boolean {
  if (!variant || typeof variant !== 'object') return false;
  if (!Number.isFinite(targetVersion) || targetVersion <= 0) return false;
  const current = Number(variant.clarity_rewrite_version ?? 0);
  const reviewed = Number(variant.directions_review_version ?? 0);
  const manual = Number(variant.manual_tuning_version ?? 0);
  if (![current, reviewed, manual].every(Number.isFinite)) return false;
  return current >= 0 && reviewed === 0 && manual === 0 && current < targetVersion;
}
