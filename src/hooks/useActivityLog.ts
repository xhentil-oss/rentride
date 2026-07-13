import { useMutation } from "./useApi";

/**
 * Logs an admin action to the ActivityLog. Failures are swallowed silently
 * since activity logging is best-effort — we never want it to block the
 * primary action (e.g. user clicks "Delete", we don't refuse the delete
 * just because logging failed).
 */
export function useActivityLog() {
  const { create } = useMutation("ActivityLog");
  return (
    action: string,
    entity: string,
    entityId: string,
    description: string,
  ) =>
    create({ action, entity, entityId, description, timestamp: new Date() }).catch(
      () => {},
    );
}
