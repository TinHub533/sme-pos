package com.smepos.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// Swagger UI at /swagger-ui/index.html, raw spec at /v3/api-docs — both
// public (see SecurityConfig) since the schema itself isn't sensitive
// (same endpoints/DTOs are visible by reading the source) and "Try it
// out" still needs a real Bearer token to call anything that matters.
// This bean just adds the "Authorize" button (paste a JWT from
// POST /auth/login) so authenticated endpoints are actually exercisable
// from the UI, not just described.
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI smeposOpenApi() {
        String bearerScheme = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("SME POS API")
                        .description("POS/inventory API for small retailers. Most endpoints require a Bearer "
                                + "JWT from POST /auth/login — use the Authorize button above with just the "
                                + "raw token (no \"Bearer \" prefix).")
                        .version("v1"))
                .addSecurityItem(new SecurityRequirement().addList(bearerScheme))
                .components(new Components().addSecuritySchemes(bearerScheme,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
