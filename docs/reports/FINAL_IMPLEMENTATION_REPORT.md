# SAPES — Final Implementation Report

**Project:** Student Academic Profiling and Evaluation System (SAPES)  
**Team:** EnTech-T — College of Technologies  
**Report Date:** 2026-10-07  
**Baseline Commit:** `b9a6dc1` (ahead of origin/main by 7 commits after Task 8 cleanup)

---

## 1. System Overview

SAPES is a secure, role-based web application for the College of Technologies. It supports:

- **Admin** — full management of user accounts, student profiles, academic records, academic status, institutional analytics, and audit trails.
- **Faculty** — student lookup, academic record viewing, schedule-conflict checks, and faculty evaluations.
- **Student** — self-service profile management, academic history viewing, GWA display, classification/status visibility, and faculty evaluation display.

The system enforces RBAC (role-based access control) and permission-based authorization at every API endpoint. All sensitive operations are persisted to MongoDB-backed AuditLog records.

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose ODM) |
| Authentication | JWT (local) + Google OAuth 2.0 |
| Email | Nodemailer (SMTP) — requires external configuration |
| Testing | Node.js native test runner (`node --test`) |

---

## 3. Role Capabilities

### Admin

- **Authentication & session security**: Local username/password login with bcrypt; JWT-based session with configurable expiry; session invalidation on account status change.
- **User management**: Create, view, and update Admin, Faculty, and Student accounts (AFR-02/AFR-03).
- **Account status management**: Activate, suspend, and deactivate accounts; all status changes are persisted and logged (AFR-04).
- **Student profile management**: View and update all permitted student profile sections (personalInformation, classification, enrollmentInformation, contactInformation, addresses, religiousInformation, educationalBackground, healthInformation) via `PUT /api/students/:institutionId`. Protected fields (`_id`, `userId`, `institutionId`, academic records, grades) are never editable through this endpoint (AFR-05).
- **Student search**: Paginated and filtered search by name or institution ID (AFR-06).
- **Academic record management**: Create/replace academic year+semester records including subjects, grades, and attendance data (AFR-07/AFR-08).
- **Academic status management**: Set and clear academic status flags including probation; changes are stored in `StudentStatusHistory` (AFR-09).
- **Academic history by period**: View all academic records sorted by year and semester (AFR-10).
- **GWA display**: Both period-specific and cumulative GWA calculated server-side (AFR-11).
- **Classification display**: IP, PWD, Shifter, Transferee, and Student Type flags visible and editable (AFR-12).
- **Faculty evaluations**: View per-student faculty evaluation results (AFR-13).
- **Institutional analytics**: Paginated student summary including GWA, classification stats, evaluation counts, and probation flags (AFR-14/AFR-15).
- **Audit trail**: Backend-persisted AuditLog for all sensitive operations; viewable in the Admin UI with category filters (AFR-16).
- **Security audit logs**: System-level audit trail visible in the Admin Security Audit Logs view; all records sourced from MongoDB only (no frontend-generated records mixed in) (AFR-17).

### Faculty

- **Authentication**: Local email/password login with JWT sessions.
- **Student lookup**: Search students by name or institution ID (requires `view_student_records` permission).
- **Academic record viewing**: View a student's academic records, GWA, and academic period history.
- **Student report**: View a student's profile report (health information is restricted to accommodation-relevant fields; religious details are hidden; scheduling restrictions are surfaced for scheduling use).
- **Schedule-conflict check**: Check whether proposed meeting times conflict with a student's declared spiritual/scheduling restrictions.
- **Faculty evaluation**: Submit or update an eligible/not-eligible/for-review evaluation for a student (requires `submit_evaluations` permission).
- **Student classification update**: Update a student's `classification` section (requires `manage_academic_records` or `submit_evaluations` permission).

### Student

- **Authentication**: Local username/password login (or institutional email); JWT sessions with legacy plain-text hash fallback for migrated accounts.
- **Personal profile self-service**: Update personal information, contact details, addresses, religious information, educational background, and health accommodations via the student-facing profile form. The following are **not** editable by students: `classification`, `enrollmentInformation`, `institutionalEmail`, `academicStatus`, and all academic records.
- **Academic history**: View all academic records organized by academic year and semester.
- **GWA display**: Period-specific and overall GWA calculated server-side.
- **Classification/status visibility**: View IP, PWD, Shifter, Transferee, and probation status (read-only).
- **Faculty evaluation display**: View the faculty evaluation result associated with their record.
- **Password reset**: Request a password reset via email (requires SMTP to be configured; see external blockers).

---

## 4. Admin Functional Requirements

| ID | Requirement | Final Status | Evidence |
|----|------------|--------------|----------|
| AFR-01 | Admin authentication | **IMPLEMENTED** | `server/routes/authRoutes.js` — JWT login, refresh, and session validation |
| AFR-02 | Manage user accounts | **IMPLEMENTED** | `server/routes/adminRoutes.js` — create/list/update users |
| AFR-03 | Manage account roles | **IMPLEMENTED** | Role field managed on account creation; RBAC enforced via `roleMiddleware` and `permissionMiddleware` |
| AFR-04 | Activate/suspend/deactivate accounts | **IMPLEMENTED** | `PUT /api/admin/users/:id/status`; session invalidated on status change |
| AFR-05 | Manage student profiles | **IMPLEMENTED** | `PUT /api/students/:institutionId` with full field whitelist; `AdminStudentProfileSetup.tsx` in Admin UI |
| AFR-06 | Search students | **IMPLEMENTED** | `GET /api/students/search` with regex-safe filtering; paginated summary |
| AFR-07 | Manage academic records | **IMPLEMENTED** | `PUT /api/students/:institutionId/academic-records` — create/replace per-period records |
| AFR-08 | Manage subject/grade records | **IMPLEMENTED** | Subjects array within each academic record; full validation via `validateAndNormalizeAcademicRecord` |
| AFR-09 | Manage academic status | **IMPLEMENTED** | `PUT /api/students/:institutionId/status`; stored in `StudentStatusHistory` |
| AFR-10 | View student academic history by period | **IMPLEMENTED** | `GET /api/students/:institutionId/report` — records sorted by year/semester |
| AFR-11 | View student GWA | **IMPLEMENTED** | `calculateOverallGwa` and `calculateMajorSubjectGwa` in `server/utils/academicCalculations.js` |
| AFR-12 | View student classifications | **IMPLEMENTED** | Classifications returned in student report; editable in Admin UI |
| AFR-13 | View faculty evaluations | **IMPLEMENTED** | Faculty evaluation embedded in student report and institutional summary |
| AFR-14 | Institutional reports/analytics | **IMPLEMENTED** | `GET /api/students/reports/summary` — aggregate statistics |
| AFR-15 | Paginated student analytics | **IMPLEMENTED** | Pagination supported via `page` and `limit` query parameters |
| AFR-16 | Admin audit administrative actions | **IMPLEMENTED** | AuditLog model; all admin operations create persisted records; category mapping fixed in `SystemAuditLogsView.tsx` |
| AFR-17 | Security audit trail (backend-only source) | **IMPLEMENTED** | Frontend-only `addAuditLog` isolated; Admin Audit Trail reads exclusively from MongoDB backend |

---

## 5. Non-Functional Requirements

| Requirement | Status | Evidence |
|------------|--------|----------|
| **Security** | ✅ Implemented | JWT authentication, bcrypt hashing, token expiry, session invalidation on status change |
| **RBAC** | ✅ Implemented | `roleMiddleware.js` + `permissionMiddleware.js`; all routes require role + permission check |
| **Input validation** | ✅ Implemented | `validateAndNormalizeStudentProfile`, `validateAndNormalizeAcademicRecord` — field whitelist, type checks, length limits |
| **Data integrity** | ✅ Implemented | `Object.assign` on allowed sections only; protected fields never overwritten; MongoDB validators + unique indexes |
| **Auditability** | ✅ Implemented | AuditLog persisted for all sensitive operations; actor, target, action, and timestamp recorded |
| **Performance** | ✅ Implemented | MongoDB indexes synchronized via `db:indexes` script; paginated endpoints; lean queries |
| **Pagination** | ✅ Implemented | `GET /api/students/reports/summary` supports `page` and `limit`; max limit enforced |
| **Maintainability** | ✅ Implemented | TypeScript frontend; modular Express routes; utility functions separated (`utils/`); 44 server-side tests |
| **Availability** | ⚠️ Local only | No deployment or uptime configuration implemented; runs locally |
| **Credential security** | ✅ Implemented | `.env` excluded from git; `.env.example` contains no secrets; no hardcoded credentials in source |

---

## 6. Authentication and Security

- **Local auth**: Email/username + bcrypt password. JWT issued on success; validated on every protected request.
- **Google OAuth 2.0**: `GOOGLE_CLIENT_ID` is configured. The OAuth flow is implemented in `server/routes/authRoutes.js`. **Interactive sign-in with an institutional Google account has not been verified** due to the absence of a test account and appropriate browser/origin setup (see Section 11).
- **Session management**: Sessions use JWT. Refresh tokens are checked against the current account status; suspended/inactive accounts are blocked.
- **Password reset**: Implementation exists (`server/routes/authRoutes.js` — `/api/auth/forgot-password`, `/api/auth/reset-password`). Reset tokens are single-use and time-limited. **Email delivery requires SMTP credentials** (see Section 11).
- **RBAC**: Every API route declares required role (`authorizeRoles`) and permission (`authorizePermission` / `authorizeAnyPermission`). Frontend hiding is supplementary only.

---

## 7. Database Architecture

**ORM:** Mongoose (MongoDB)  
**Development database:** `sapes_dev`  
**Models:**

| Model | Purpose |
|-------|---------|
| `User` | Admin and Faculty accounts |
| `Student` | Student accounts and all profile sections |
| `AcademicRecord` | Per-student, per-period academic records with subjects |
| `FacultyEvaluation` | Faculty evaluation per student |
| `StudentStatusHistory` | History of academic status changes |
| `AuditLog` | Persisted audit trail for all sensitive operations |
| `Session` | (if applicable) Refresh token storage |

**Index management:** Run `npm --prefix server run db:indexes` to synchronize all indexes. Required after initial setup and after schema changes.

> React does not connect directly to MongoDB. All data access goes through the Express REST API.

---

## 8. Academic Record Architecture

Each `AcademicRecord` document belongs to one student (`studentId` reference) and represents one semester (`academicYear` + `semester`). It contains an array of `subjects`, each with:

- `subjectCode`, `subjectName`, `units`
- `midtermGrade`, `finalGrade` — individual assessment components
- `grade` — computed or directly entered final grade
- `attendance` — percentage
- `submissions` — count
- `isMajor`, `status` (enrolled/dropped/etc.)

GWA is calculated server-side using unit-weighted averages. Dropped and ungraded subjects are excluded.

---

## 9. Audit Architecture

All sensitive operations create a persisted `AuditLog` document:

```
{
  userId:     ObjectId  // actor (admin/faculty)
  action:     string    // e.g. UPDATE_STUDENT_PROFILE, ACADEMIC_RECORD_SAVED
  targetType: string    // e.g. student, academic_record
  targetId:   ObjectId
  details:    object    // non-sensitive metadata (institutionId, updatedFields, etc.)
  createdAt:  Date
}
```

The Admin Security Audit Trail reads exclusively from MongoDB. Frontend-generated events are completely isolated from the production audit source.

---

## 10. Testing Summary

| Verification | Result |
|-------------|--------|
| **Server tests** | **44 passed, 0 failed** |
| **Client TypeScript lint** | **0 diagnostics** |
| **Client production build** | **Succeeded** — 1707 modules, no errors |
| **Database indexes** | **Verified** (`npm --prefix server run db:indexes` passes) |
| **`git diff --check`** | **Passed** — no whitespace errors |
| **GET /api/health** | Accessible when backend is running; returns `{ status: "ok", database: "connected" }` |

Server test coverage includes:

- GWA calculation (unit-weighted, major/overall, period-scoped)
- Academic record normalization and rejection of invalid fields
- Authentication (student, faculty, legacy password hash, session refresh, suspension)
- Student profile validation (allowed sections, protected fields, type checks, date validation)
- Health condition validation
- Spiritual activity time validation
- Student search (including regex-safe handling)
- Password reset token single-use enforcement
- Academic status update and probation flag
- Student report access control (faculty-scoped vs admin-scoped)
- Account creation (admin only, unauthenticated rejected)

---

## 11. Known External Verification Items

### SMTP — Password Reset Email Delivery

**Status:** NOT CONFIGURED IN CURRENT DEVELOPMENT ENVIRONMENT

The password-reset backend implementation exists and is unit-tested (single-use token enforcement passes). However, SMTP credentials have not been configured in `server/.env`. The following variables must be set before email delivery can be tested:

```
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
```

**Remaining verification required:**
- Real password-reset email is delivered to a controlled address.
- Reset link/code is valid and completes the flow.
- Old password no longer works after reset.
- Reset token cannot be reused.

### Google OAuth 2.0 — Institutional Sign-In

**Status:** `GOOGLE_CLIENT_ID` is configured; interactive sign-in has NOT been verified end-to-end.

The Google OAuth flow is implemented on both backend and frontend. Verification requires:
- An authorized institutional Google test account.
- A properly configured browser/origin environment where the OAuth redirect URI matches the Google Cloud Console configuration.

**Remaining verification required:**
- Successful institutional Google sign-in.
- Correct SAPES user is resolved and session is created.
- Suspended/inactive accounts remain blocked after Google sign-in.
- Logout revokes the session.

> These items are marked as external verification pending, **not** as implemented-and-verified.

---

## 12. Known Planned / Future Work

| Item | Status |
|------|--------|
| SMTP email delivery | External configuration required (credentials not set) |
| Google OAuth interactive verification | Requires test account and correct browser/origin setup |
| Production deployment configuration | Not implemented; application currently runs locally |
| Shared MongoDB Atlas setup | Instructions documented in `server/.env.example` and README; shared database not provisioned |
| Local-to-Atlas data synchronization | **Not implemented** and not planned; developers use Atlas directly |
| Offline / PWA support | Not implemented |

---

## 13. Final Readiness Assessment

**READY FOR FINAL DEMONSTRATION WITH DOCUMENTED EXTERNAL DEPENDENCIES**

The SAPES system is functionally complete for all in-scope Admin, Faculty, and Student workflows. The server test suite (44 tests) passes with 0 failures. The TypeScript frontend compiles cleanly. The codebase is free of temporary scripts, tracked secrets, and dead legacy components.

Two external dependencies remain unverified due to the absence of SMTP credentials and an authorized institutional Google test account. These are clearly documented above and do not affect the core academic profiling, record management, or audit trail functionality.

The system is ready for demonstration and final group evaluation. Before a production release, SMTP credentials must be configured and Google OAuth must be verified with an institutional account.
