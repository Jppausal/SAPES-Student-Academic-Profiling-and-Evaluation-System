# TASK 7 COMPLETION REPORT

## Status

**PARTIAL — application tests pass; external authentication delivery remains unverified.**

All 45 API/MongoDB scenarios, 18 browser workflow groups, and 44 server tests pass after five confirmed defects were fixed. Real password-reset email delivery cannot pass in the current environment because SMTP is not configured. Successful Google sign-in was not exercised with a valid institutional Google credential; missing/invalid credential handling passed.

No Task 8 work was started.

## Environment

- Windows, Node.js, Express/Mongoose backend, Vite/React frontend, headless Edge browser.
- Configured application database: **local MongoDB, `sapes_dev`**, not Atlas. Read-only inspection found 7 students, 24 academic records, and 9 users. No conflicting probation flags were found in existing records.
- Write tests used isolated local database `sapes_task7_1791371763000`; earlier isolated test databases were retained. No existing application accounts, profiles, permissions, or grades were changed by the tests.
- Test backend: actual application routers, middleware, models, and JWT sessions on port 5017. Test frontend: Vite on port 3017, pointed at that backend. No application data was mocked in the browser.
- The email transport alone was replaced by an in-memory code capture for reset-flow testing. This does not constitute proof of SMTP delivery.
- Browser fixtures: 27 fictional students, with the primary student having three academic periods across two academic years. Analytics pagination was verified at 25 + 2 rows.
- Existing development services were left separate from the test services. A backend process already running before these changes needs a normal restart to load the route fixes.

## Admin End-to-End

| Step | Result | Notes |
|---|---|---|
| Login | PASS | Real login API and browser form |
| Dashboard loads and survives reload | PASS | Session restored |
| User Management | PASS | MongoDB-backed accounts displayed |
| Search user | PASS | Matching and empty results |
| Create permitted accounts | PASS | Student, faculty, administrator created through protected API |
| Edit permitted account | PASS | API persistence and browser modal/save |
| Change account status | PASS | Browser controls; inactive/suspended login and session denial |
| Role permissions | PASS | Browser load/save; API removal and restoration immediately enforced |
| Search student | PASS | Exact institutional ID |
| View Student Profile | PASS | Existing stored sections displayed |
| Edit permitted profile field and save | PASS | Browser save and API persistence |
| Verify profile audit event | PASS | Persisted event and category filter, after audit refresh |
| View Academic Records | PASS | Existing term records |
| Select year/semester | PASS | First and second semester records remain distinct |
| Edit/save academic record | PASS | API upsert and browser save |
| Verify GWA | PASS | Independently calculated expected semester values |
| Update academic status | PASS | Status history and probation flag persisted |
| Institutional Analytics | PASS | Counts, GWA, and stored evaluation |
| Pagination/search | PASS | 27 distinct records across two pages; empty search |
| Security Audit Trail | PASS | Backend events only |
| Filter categories | PASS | Profile category includes student self-service updates |
| Responsive UI | PASS | 1440, 1280, 820, and 390px; contained table/tab scrolling |
| Logout | PASS | Token removed in UI and rejected by backend |

## Student End-to-End

| Step | Result | Notes |
|---|---|---|
| Login/dashboard/reload | PASS | Authenticated own profile, persistent session |
| Personal profile loads | PASS | MongoDB data |
| Edit allowed fields/save | PASS | API and browser |
| Academic records load | PASS | Own records only |
| Academic Year selector | PASS | 2024-2025 and 2025-2026 |
| Semester selector | PASS | First/second semester |
| Historical subjects/grades | PASS | HISTORY101, IT101/IT102/GE101, and IT201/IT202/GE201 are isolated to their periods |
| GWA | PASS | Second semester Overall 1.75 / Major 1.63 |
| Faculty evaluation appears | PASS | Saved `for_review` evaluation and remarks visible after report fix |
| Cannot modify grades | PASS | No edit controls; write API returns 403 |
| Cannot access Admin functionality | PASS | Backend authorization matrix |
| Logout | PASS | Session revoked |

## Faculty End-to-End

| Step | Result | Notes |
|---|---|---|
| Login/workspace | PASS | Browser and API |
| Search/select student | PASS | Exact institutional ID |
| Student report | PASS | Correct shared profile/GWA |
| Academic history | PASS | Distinct stored periods and subjects |
| Faculty evaluation | PASS | Browser evaluation save; API course-progress save/reload |
| Academic status | PASS | Browser update and API history persistence |
| Unauthorized Admin functionality | PASS | Protected APIs return 403 |
| Logout | PASS | Session revoked |

## Authorization Matrix

Verified against real backend middleware using the default permissions, with a separate permission-removal test.

| Operation | Admin | Faculty | Student | Verified |
|---|---|---|---|---|
| Manage users | Allow | Deny | Deny | Yes |
| Manage roles | Allow | Deny | Deny | Yes |
| Update student profile through staff route | Allow | Deny | Deny | Yes |
| Update academic records | Allow | Deny | Deny | Yes |
| View staff academic report | Allow | Allow | Deny | Yes |
| View own academic report | Student route denied | Student route denied | Allow own | Yes |
| Update academic status | Allow | Allow | Deny | Yes |
| Submit student faculty evaluation | Deny | Allow | Deny | Yes |
| Institutional analytics | Allow | Deny | Deny | Yes |
| Audit logs | Allow | Deny | Deny | Yes |
| Student self-service profile | Deny | Deny | Allow own | Yes |

Admin denial on the faculty-evaluation endpoint reflects its existing faculty-only rule. Course-progress endpoints retain their existing role/permission checks. No permission expansion was introduced.

## Authentication / Session Tests

| Scenario | Expected | Result |
|---|---|---|
| Valid role logins | Authenticate | PASS |
| Invalid password/username | 401 | PASS |
| Suspended/inactive account | Reject login and old session | PASS |
| Revoked session | Reject | PASS |
| Logout | Invalidate token | PASS |
| Role change | Revoke previous session | PASS |
| Page reload | Restore valid session | PASS |
| Missing authentication | 401 on protected routes | PASS |
| Reset request/code verification/password update | Verify code before password change | PASS with captured test email code |
| Invalid reset code | Reject | PASS |
| Inactive account verifies code | Reject | PASS |
| Reused/concurrent reset authorization | Exactly one successful use | PASS; permanent regression test |
| Password reset | Revoke prior sessions; accept new password | PASS |
| Real reset email | Deliver verification code | NOT VERIFIED: SMTP unconfigured |
| Missing/invalid Google credential | Reject safely | PASS |
| Valid institutional Google sign-in | Authenticate | NOT VERIFIED: valid interactive credential unavailable |

## Academic Integrity Tests

- PASS: unique `(studentId, academicYear, semester)` index; repeated saves update one term; direct duplicate insertion rejected with MongoDB duplicate-key error.
- PASS: duplicate subject codes, invalid units, invalid grades, and malformed major flags rejected.
- PASS: major/non-major flags and grades persist after fresh reads.
- PASS: first-semester Major GWA 1.50; second-semester Major GWA 1.63 and Overall GWA 1.75, consistent across all roles.
- PASS: dropped/ungraded/zero-unit exclusions in existing calculation tests. Zero-unit writes remain rejected by current API validation; legacy zero-unit records remain excluded from calculation.
- PASS: historical switching across two years and three periods; no subjects mixed between periods.

## Profile Integrity Tests

- PASS: administrator allowed personal, classification, enrollment, health, address, and religion fields persist.
- PASS: student personal/health/religion self-service fields persist; protected classification/enrollment writes rejected.
- PASS: `institutionId`, `userId`, grades, and academic status rejected through ordinary profile updates.
- PASS: existing academic records unchanged after profile updates.
- PASS: IP/PWD/shifter flags persist; health condition and spiritual-schedule structures validate.
- PASS: client-supplied identity query parameters cannot select another student's own-report data.

## Audit Log Verification

PASS: MongoDB events exist for user creation, user updates, account status, permissions, administrator/student profile updates, academic records, academic status, faculty evaluation, and course progress.

PASS: exact action filters return matching persisted events; nested password/token detail fields are removed from API responses. Sensitive profile values and password values are not included in the tested mutation events.

PASS: browser Profile Update filter shows `STUDENT_PROFILE_UPDATED` after correcting its category mapping. The displayed audit collection is populated by the backend API, not the separate legacy local audit array. Audit refresh was performed before checking newly written events.

## Analytics Verification

- PASS: totals match MongoDB documents; IP=1, PWD=1, probation=1, evaluated=1 in the controlled fixture.
- PASS: expected latest-period GWA values match the student and faculty reports.
- PASS: 27 students return 25 and 2 distinct rows on pages 1 and 2; no duplicates or omissions.
- PASS: browser Next/Previous, page filter, and empty results.
- PASS: invalid pages `0`, `-1`, and nonnumeric values return 400; out-of-range valid pages return empty results.

## Database / Index Verification

`npm --prefix server run db:indexes` passed against configured `sapes_dev` without duplicate-data conflicts.

Direct inspection confirmed unique indexes on User username/Google ID, Student institution ID/username/user linkage, and AcademicRecord student/year/semester. No indexes or application data were dropped. Temporary databases were retained separately for test isolation.

## Defects Found

| Severity | Defect | Root cause | Resolution |
|---|---|---|---|
| HIGH | Password-reset authorization reusable | Signed authorization lacked consumed server-side state | Hashed random nonce stored in existing reset fields and atomically consumed; concurrent and replay tests pass |
| MEDIUM | Probation count stays zero after status change | Status route did not update `isOnProbation` used by reports | Set/clear flag together with authorized status change; no automatic GWA policy added |
| MEDIUM | Student sees pending evaluation despite saved faculty evaluation | Own-report endpoint omitted evaluation required by existing UI | Return only own evaluation status/reasons/remarks/date |
| MEDIUM | Audit page expands beyond narrow viewport | Grid item's automatic minimum width followed table content | Two `min-width: 0` constraints; 390px viewport retested |
| LOW | Student profile audit events classified as System | Missing `STUDENT_PROFILE_UPDATED` mapping | Map existing backend event to Profile Update |

No unresolved BLOCKER or HIGH code defects were found in the exercised scenarios. This is not an exhaustive security audit. Real email delivery is an outstanding environment dependency.

## Regression Commands

| Command | Result |
|---|---|
| `npm --prefix client run lint` | PASS, zero diagnostics |
| `npm --prefix client run build` | PASS |
| `npm --prefix server test` | PASS, **44 tests**, zero failures/skips |
| `npm --prefix server run db:indexes` | PASS |
| JavaScript syntax checks for changed routes | PASS |
| `git diff --check` | PASS |
| Temporary real-MongoDB API harness | PASS, **45 scenarios** |
| Temporary Edge browser harness | PASS, **18 workflow groups**, zero runtime exceptions in final run |

Browser assertions covered load/reload, mutations, navigation, period selection, pagination, and width constraints. Screenshots were also visually inspected. Early harness failures caused by address-field naming, exact button labels, and load timing were corrected; application defects were reproduced separately before fixing.

## Files Changed

- `server/routes/authRoutes.js`: consume verified reset authorization once; reject inactive verification.
- `server/routes/studentRoutes.js`: synchronize probation flag during status changes.
- `server/routes/meRoutes.js`: include own saved faculty evaluation in student report.
- `client/src/context/AppContext.tsx`: correct student profile audit category.
- `client/src/components/admin/admin-ui.css`: contain narrow audit-table overflow.
- `server/test/task7Regression.test.js`: four permanent regression tests for reset concurrency/replay, inactive reset, probation transitions, and own evaluation projection.
- `TASK_7_COMPLETION_REPORT.md`: this test evidence and limitations.

No UI redesign, schema migration, new feature, unrelated refactor, or environment credential changes were made. Existing reset authorizations issued before the fix must be requested again because they lack the new nonce.

## Final Acceptance Criteria

| Criterion | Result |
|---|---|
| Admin end-to-end | PASS |
| Student end-to-end | PASS |
| Faculty end-to-end | PASS |
| Backend authorization matrix | PASS |
| Session/security checks | FAIL completion gate: application checks pass, but real reset email delivery unverified |
| Academic integrity | PASS |
| Profile integrity | PASS |
| Audit integrity | PASS |
| Analytics/reporting | PASS |
| Database indexes | PASS |
| Client lint | PASS |
| Client build | PASS |
| Server tests | PASS |
| Diff check | PASS |
| No unresolved BLOCKER/HIGH code defect in tested scope | PASS |

## Recommendation

Hold full Task 7 sign-off until SMTP is configured and a real verification-code email is received and used successfully. Perform a valid institutional Google sign-in when an authorized interactive account is available. The tested application flows pass, but those external checks must not be represented as completed. Stop here; Task 8 has not begun.
