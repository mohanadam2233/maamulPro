import AuditLog from '../models/AuditLog.js';

export function writeAudit(req, { action, entityType, entityId, before, after, reason }) {
  return AuditLog.create({
    tenantId: req.tenantId,
    actorId: req.user?._id,
    action,
    entityType,
    entityId,
    before,
    after,
    reason,
    ip: req.ip,
  });
}
