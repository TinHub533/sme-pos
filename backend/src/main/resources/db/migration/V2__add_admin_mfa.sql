-- TOTP-based MFA, opt-in, scoped to ADMIN accounts today (see
-- MfaService/AuthController) — mfa_secret stays null and mfa_enabled false
-- for every existing account until an admin explicitly enrolls, so this
-- never retroactively locks anyone out.
ALTER TABLE app_users ADD COLUMN mfa_secret VARCHAR(64);
ALTER TABLE app_users ADD COLUMN mfa_enabled BOOLEAN NOT NULL DEFAULT false;
