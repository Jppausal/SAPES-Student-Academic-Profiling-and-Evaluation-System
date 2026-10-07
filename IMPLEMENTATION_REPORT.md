# SAPES Implementation Report

Updated: 2026-09-27

## Implemented in the current work

### Student profile requirements T104-T106

- Students update personal information, classification, and religion through `PUT /api/me/student/profile`.
- Student identity is resolved from the authenticated user; the endpoint does not accept a client-selected student ID.
- Classification supports IP, PWD, shifter, and transferee flags.
- The student dashboard displays all structured classification flags.
- A shared validator rejects protected sections, unsupported nested fields, invalid types, oversized strings, and invalid dates.
- The rendered student portal uses only authenticated profile and report responses for profile, academic records, status, and GWA.
- A student can open and edit their profile whenever the authenticated profile endpoint succeeds, even if the separate academic-report request fails. The academic view displays its own error state.
- Philippine location responses are validated and unwrapped from the PSGC Cloud `data` envelope before selectors render.
- Religious information uses a curated selection, plus Other — specify and Prefer not to say. It remains optional and stored through the existing protected profile API.
- Students may opt in to share recurring unavailable time slots for spiritual activities. Faculty reports expose only day/time restrictions, never a religion or activity description; a protected schedule-conflict endpoint supports enrollment checks.
- Classification is staff-managed: faculty or administrators set continuing, shifter, transferee, and related classification information. Academic status is maintained through the audited staff status workflow and supports Regular, Irregular, Probationary, and FDA labels.
- The account menu provides Settings for every role. It starts an email-verified password change and presents role-appropriate notification categories; protected role, permission, classification, academic-status, and academic-record fields are excluded.
- Notification preferences now load from and save to the authenticated user record through `/api/auth/settings`.

### Student academic history

- Students select an academic year and semester from periods returned by `GET /api/me/student/report`.
- Only the subjects, units, grades, major classification, status, and major-subject GWA for the selected period are rendered.
- The newest stored period is selected by default, and empty or malformed record states are handled without exposing edit controls.
- The report endpoint resolves the student through the authenticated user and returns a server-calculated major-subject GWA for every academic term.
- `npm run seed:student-test-records` idempotently inserts three MongoDB-backed demonstration periods for `student.test` without replacing existing periods.

### SAPES v1 profile baseline

- Student profiles now support enrollment context, contact information, present/home addresses, educational background, and relevant health accommodation details in the existing `students` collection.
- Present and home addresses support country, province, municipality, barangay, street, and ZIP code. Philippine selections are guided by the PSGC Cloud hierarchy; selecting Other keeps the address fields manually editable.
- Personal information supports optional suffix, dual citizenship, height, weight, and blood type. Sex and civil-status entries are standardized select controls.
- Student self-service updates use explicit server-side field whitelists; institution ID, account linkage, role, academic status, grades, and evaluations remain protected.
- Faculty reports include enrollment context and only health accommodation signals/notes needed for evaluation; detailed condition descriptions remain excluded from faculty responses.
- Health profiles support a validated medical-history checklist, allergies, an Other condition, accommodation requirements, private notes, and emergency-contact information. “None” is mutually exclusive with every condition.

The configured database now contains these added `student.test` demonstration records:

- `2024-2025 / 2nd Semester`: IT 121 Computer Programming 2 (3, 1.75, major), IT 122 Discrete Structures (3, 2.00, major), GE 104 Mathematics in the Modern World (3, 1.50, non-major). Period major GWA: 1.88.
- `2025-2026 / 1st Semester`: IT 201 Data Structures and Algorithms (3, 2.00, major), IT 202 Object-Oriented Programming (3, 1.50, major), GE 201 Science, Technology and Society (3, 2.00, non-major). Period major GWA: 1.75.
- `2025-2026 / 2nd Semester`: IT 211 Database Systems (3, 1.50, major), IT 212 Web Systems and Technologies (3, 1.75, major), GE 205 Ethics (3, 1.50, non-major). Period major GWA: 1.63.

The existing `2026-2027 / 1st` test record was preserved. A second seed run made no changes and reported all three added periods as already existing.

### BSIT curriculum demonstration cohort

- `npm run seed:bsit-students` creates five fictional student accounts and linked profiles using the existing User, Student, and AcademicRecord collections.
- All five students share the referenced 2024-2025 BSIT curriculum subject sequence across four terms, with varied fictional grades.
- The seed validates every academic record and uses the existing unique student/year/semester key with insert-only upserts, so reruns do not duplicate or overwrite terms.
- SAPES does not currently have a separate curriculum model; shared enrollment is represented by the same period and subject structure in each authoritative student record.

Created test accounts (shared development password: `Test1234!`):

- `bsit.test01` / `TEST-BSIT-0001` / Alex Rivera
- `bsit.test02` / `TEST-BSIT-0002` / Bianca Santos
- `bsit.test03` / `TEST-BSIT-0003` / Carlo Mendoza
- `bsit.test04` / `TEST-BSIT-0004` / Dana Flores
- `bsit.test05` / `TEST-BSIT-0005` / Ethan Garcia

Each account has 32 subjects across `2024-2025 / 1st Semester`, `2024-2025 / 2nd Semester`, `2025-2026 / 1st Semester`, and `2025-2026 / 2nd Semester`. Runtime verification confirmed login and authenticated report responses returned `200` for all five accounts, all curriculum subject-code sequences matched, and all five grade sets were distinct. A second seed run reported all 20 term records as already existing.

### Administrative student profile management

- Administrators with `manage_academic_records` can update allowed profile sections through `PUT /api/students/:institutionId`.
- Institution ID, user linkage, account role, and academic data are excluded from ordinary profile updates.
- Faculty and administrators update academic status through `PUT /api/students/:institutionId/status`, which preserves status history and writes an audit entry.

### Administrative academic records

- Administrators search for the authoritative student record by institution ID.
- `PUT /api/students/:institutionId/academic-records` creates or replaces one academic-year and semester record.
- Subject codes, names, units, grades, major flags, status values, duplicate codes, and record size are validated server-side.
- Academic-year and semester records are unique per student.
- Successful changes write an audit entry and refresh the displayed report and major-subject GWA.

### Faculty evaluation workspace

- Faculty search students by institution ID through the protected report API.
- Persisted term subjects and major-subject GWA are displayed from MongoDB.
- Faculty evaluation status, reasons, and remarks are saved through the authorized evaluation endpoint.
- Academic status and its reason are saved through the status-history endpoint.
- The former browser-local faculty roster and dossier are no longer rendered by the faculty portal.

### Institutional reporting

- Administrators load a paginated institutional summary through `GET /api/students/reports/summary`.
- The endpoint batches students, academic records, and evaluations without per-student queries.
- The analytics view reports classifications, religion, record counts, subject counts, academic status, evaluation status, and major-subject GWA from MongoDB.
- The analytics table retrieves 25 students per page and provides previous/next controls across the complete institution dataset.
- Student, faculty, and administrator reports share the same server-side major-subject GWA calculation.

### Authentication and account security

- Every protected request verifies the JWT, stored session, current user record, and current account status.
- Role and username are refreshed from the database so account changes take effect without waiting for JWT expiration.
- Suspended and inactive accounts cannot continue using an existing session.
- Google sign-in checks account status in every account-linking branch.
- Invalid Google credentials produce a controlled authentication response rather than exposing internal errors.
- Password resets, role changes, suspension, and deactivation revoke active sessions.
- `GET /api/auth/session` restores only a currently valid, active, non-revoked session.
- The client waits for backend session validation before rendering any role dashboard and clears invalid saved tokens.
- An authenticated runtime smoke test confirmed login (`200`), session restoration (`200`), logout (`200`), and rejection of the revoked token (`401`); the temporary account was removed afterward.

### User and student integrity

- `Student.userId` remains required and is unique.
- Student roles and institution IDs cannot be changed through generic account editing.
- Faculty and administrator roles can be updated by an authorized administrator.
- Failed student-profile creation removes the partially created user account.
- Student name changes made through account management synchronize to the linked student profile.

## Verification

The following checks passed on 2026-09-27:

```text
server: npm test
server: node --check for every JavaScript file
client: npm run lint
client: npm run build
repository: git diff --check
```

The backend suite contains focused tests for session/account-status enforcement and student-profile validation.

The academic-history runtime check confirmed `student.test` login (`200`), own report access (`200`), exact period separation and GWA values, unauthenticated rejection (`401`), denial on the arbitrary institution-ID report route for a student (`403`), and continued faculty/admin report access (`200` each).

Production dependency audits report zero known vulnerabilities for both the server and client. The backend `qs` transitive dependency was updated to `6.16.0` to resolve two moderate denial-of-service advisories.

The configured MongoDB database was reachable on 2026-09-27. `npm run db:indexes` completed successfully after duplicate detection, and read-only verification confirmed both the unique `Student.userId` index and the unique student/academic-year/semester index are present.

The Express server was started against the configured environment on 2026-09-27. It connected to MongoDB, returned HTTP 200 from `/api/health`, and rejected an unauthenticated `/api/users` request with HTTP 401. The health endpoint now returns HTTP 503 with a degraded state when MongoDB is unavailable.

An authenticated API smoke test also passed using an isolated temporary administrator: password login, protected user listing, protected institutional reporting, and logout all succeeded. Cleanup removed the temporary account and its sessions, and a follow-up query confirmed no temporary smoke-test users remained. The existing database account was not modified.

## 2026-10-07 Faculty search and GWA consistency correction

Faculty exact-ID search was reproduced against the connected local API: `GET /api/students/search?q=2401105814` returned no suggestions while the protected exact report endpoint found the same student. The suggestion query had required the duplicated `Student.accountStatus` field to be `active`, even though authentication status is authoritatively enforced for the signed-in user. Authorized faculty/admin record search now includes existing student profiles regardless of that duplicated field, and the faculty client falls back to the protected exact report endpoint when an institution ID produces no suggestion.

Major-subject GWA now has explicit scopes. Each academic record returned by student, faculty, and admin report APIs includes its server-calculated period GWA. Admin academic-record management shows the selected-period GWA separately from the cumulative GWA across all recorded periods. Institutional analytics shows the latest-period GWA with its academic year/semester and retains the cumulative value as secondary context. The existing unit-weighted calculator remains the single calculation source; grades and academic records were not modified.

Verification completed:

```text
server: npm test - 32 passed
server: JavaScript syntax checks - passed
client: npm run build - passed
browser fixture: faculty exact-ID fallback - passed
browser fixture: selected-period 1.25 / cumulative 1.32 admin display - passed
live connected API/browser: faculty search for 2401105814 - passed
repository: git diff --check - passed
```

The full client TypeScript check still reports three pre-existing diagnostics in `UserSettingsModal.tsx`, `StudentPortal.tsx`, and `ForgotPasswordPage.tsx`; this change introduced no additional diagnostics.

The already-running backend reports MongoDB as connected. A fresh standalone connection using the current `server/.env` returned `Invalid connection string`, so that environment value must be corrected before restarting the backend. No credential value was printed or changed during this work.

## 2026-10-07 Merge-conflict repair

The merge commit following the faculty-search and GWA correction accidentally retained Git conflict markers in the student workspace stylesheet, related student/faculty React components, two backend routes, and the student-redesign report. This caused Tailwind/Vite to stop at `.student-badge-other` with a missing-closing-brace error and would also have prevented the affected backend routes from loading after a server restart.

The conflict set was resolved in favor of the integrated behavior: Major/Non-major subject labels, exact institution-ID report fallback, explicit cumulative GWA labels, shared search filtering, and period-specific GWA values. A repository-wide scan confirmed that no conflict markers remain.

Verification completed:

```text
client: npm run build - passed
server: npm test - 32 passed
server: syntax checks for repaired routes - passed
repository: conflict-marker scan - passed
repository: git diff --check - passed
```

The full client TypeScript check continues to report only the three previously documented diagnostics in `UserSettingsModal.tsx`, `StudentPortal.tsx`, and `ForgotPasswordPage.tsx`.

## 2026-10-07 Latest-period GWA consistency correction

Live verification of Alex Rivera (`TEST-BSIT-0001`) confirmed that the apparent `1.30` versus `1.32` discrepancy came from two valid calculations with different scopes. The student dashboard displayed the latest selected term, while faculty headers promoted the cumulative value across all four recorded terms.

For AY 2025-2026, 2nd Semester, Alex's five equally weighted major grades are `1.00`, `1.50`, `1.25`, `1.50`, and `1.25`, producing a period GWA of `1.30`. Combining major subjects from every recorded semester produces the historical cumulative value `1.32`.

The backend now derives and returns `latestAcademicPeriod` through one shared helper for authenticated student reports, faculty workspaces, staff reports, academic-record management, and institutional summaries. The helper compares academic year and semester rather than relying on database result order. Faculty search, faculty academic records, and faculty evaluation history now show latest-period GWA as the primary value with the exact academic year and semester. The historical cumulative value remains visible only as explicitly labeled secondary context. Admin screens use the same terminology.

Verification completed:

```text
live MongoDB/API data: Alex latest-period GWA 1.30 and historical cumulative 1.32 - confirmed
server: npm test - 33 passed
server: syntax checks for changed routes and utilities - passed
client: npm run build - passed
repository: git diff --check - passed
```

The full client TypeScript check continues to report the same three pre-existing diagnostics in `UserSettingsModal.tsx`, `StudentPortal.tsx`, and `ForgotPasswordPage.tsx`; this correction introduced no additional diagnostics.

## Known remaining work

- Remove obsolete mock-data components and local context mutations after confirming no remaining runtime consumers outside user-management compatibility state.
- Perform live end-to-end tests with MongoDB and valid institutional Google credentials.
- Design offline local MongoDB operation and Atlas synchronization; synchronization is not implemented.

This correction does not modify environment files or credential values.
