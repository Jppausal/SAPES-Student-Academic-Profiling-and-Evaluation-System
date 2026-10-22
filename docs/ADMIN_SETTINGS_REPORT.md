# Admin Settings implementation — 2026-10-20

## Scope and architecture

Added App Settings to Admin navigation using the existing admin styling. Sections: General, Integrations, Security, Academic, System & Audit. General/security/academic information is read-only; unsupported maintenance mode and editable business rules were not introduced. System health uses the existing health API and an audit-log navigation button.

Current authentication uses role-specific AdminUser, FacultyUser, and Student account collections. Settings reuse their JWT/session middleware and require admin role plus existing manage_users permission. Existing uncommitted authentication/database tests and generated dependency files were preserved.

## Persistence and defaults

`SystemSettings` stores one document (`_id: system`) in `system_settings`: Google/SMTP/reCAPTCHA enabled booleans, updater ID, and timestamps. No secrets are stored. Singleton uses MongoDB's built-in unique _id index.

Before the first save, Google and SMTP enabled flags default to true to preserve existing configured behavior, but their effective availability also requires valid configuration. reCAPTCHA defaults false and is unavailable because there is no implementation. No migration or seeded settings document is required. First authorized update creates it; subsequent changes persist. Credentials remain in environment variables.

Settings are read directly on each request; no process cache or restart is needed. Settings responses use Cache-Control: no-store. Frontend reads availability on page/modal load. An already-open page may retain an old display until reload, but every new Google/reset/send request checks the backend setting.

## APIs and enforcement

- GET /api/settings/public: only integration enabled/configured/available booleans.
- GET /api/settings: admin + manage_users.
- PUT /api/settings: strict whitelist; accepts integration booleans only, rejects unknown/secret fields and enabling unavailable/unconfigured services.
- POST /api/auth/google: disabled Google rejects direct requests with 503; manual login remains available.
- POST /api/auth/password-reset/request: disabled/unconfigured SMTP rejects before account lookup, avoiding a false email-sent claim. Mail transport itself also checks the setting before creating a transport.
- Settings changes generate SYSTEM_SETTINGS_UPDATED audit events with actor role/model, changed integration names, previous/new booleans, and timestamp.

Google availability controls GIS loading/button rendering. Forgot Password and account Settings show email-service unavailability and disable their send buttons. Existing reset codes already issued are not revoked; their verification/confirmation security remains unchanged.

## Verification

- Four focused test cases cover admin read/update and audit, denied roles/permission/invalid payloads, Google disabled plus working manual login, SMTP blocked before transport and enabled transport behavior.
- Existing Google auth tests mock the new settings read while retaining their token-verification/account tests.
- Full server suite: 68 passed, 0 failed.
- Client lint and build: passed. Build retains a >500 kB bundle warning.
- db:indexes: passed against configured cloud sapes_dev database, including SystemSettings.
- JavaScript syntax checks and git diff --check: passed.
- Controlled local MongoDB database: actual settings API, singleton creation/update, audit insertion, and reconnect persistence passed. No production integration toggles were changed.
- Browser: admin settings toggles/unavailable controls, reload persistence, Google hidden when off, reset disabled/message when SMTP off, and Google sign-in container restored when enabled.

## Environment limits

Google server configuration is present. End-to-end live Google account authentication was not performed; token verification behavior was covered by existing mocked tests. SMTP is not configured in the current environment; actual email delivery was not attempted, while enabled transport behavior was tested with a stub. reCAPTCHA remains unimplemented and cannot be enabled. Maintenance mode remains unsupported and read-only.
