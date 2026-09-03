package com.smepos.dto;

import java.time.Instant;
import java.util.UUID;

public class AuditDtos {

    public record AuditLogResponse(
            UUID id,
            String actorUsername,
            String action,
            String targetType,
            String targetId,
            String detail,
            Instant createdAt
    ) {}
}
