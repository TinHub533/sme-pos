package com.smepos.service;

import com.smepos.dto.AuditDtos.AuditLogResponse;
import com.smepos.entity.AuditLog;
import com.smepos.repository.AuditLogRepository;
import com.smepos.security.CurrentUser;
import com.smepos.security.UserPrincipal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.UUID;

// record() is deliberately NOT @Transactional on its own — it's meant to be
// called from inside the SAME @Transactional method as the action it's
// logging (ShopService.setActive, AdminUserService.createAdmin, etc.), so
// the audit row commits or rolls back atomically with the action itself.
// That's the whole reason this lives in the same Postgres database rather
// than a separate store: a distributed write here could leave an action
// recorded with no audit trail, or vice versa.
@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    // Common case: the authenticated caller is the actor.
    public void record(String action, String targetType, String targetId, String detail) {
        UserPrincipal actor = CurrentUser.get();
        record(actor.getId(), actor.getUsername(), action, targetType, targetId, detail);
    }

    // For the one case where there's no authenticated caller to pull an
    // actor from — AdminUserService.bootstrap() runs on the public,
    // unauthenticated /admin/bootstrap endpoint, where the newly created
    // admin is self-referentially both the actor and the target.
    public void record(UUID actorId, String actorUsername, String action, String targetType, String targetId, String detail) {
        auditLogRepository.save(new AuditLog(actorId, actorUsername, action, targetType, targetId, detail));
    }

    public Page<AuditLogResponse> list(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::toResponse);
    }

    private AuditLogResponse toResponse(AuditLog log) {
        return new AuditLogResponse(
                log.getId(), log.getActorUsername(), log.getAction(),
                log.getTargetType(), log.getTargetId(), log.getDetail(), log.getCreatedAt());
    }
}
