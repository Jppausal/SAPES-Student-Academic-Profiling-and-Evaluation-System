# Student classification / status UI verification

Verified 2026-10-14. Status: COMPLETE / READY.

## Confirmed gaps and changes

- Active StudentPortal uses StudentProfileSetup and BackendStudentWorkspace. Legacy StudentProfileForm has no consumers and was left unchanged.
- Backend model and self-service validator already support isShifter, isTransferee, isIP, and isPWD. Only their student form controls were missing. Added a Student Classifications section with four independent checkboxes initialized from the authenticated profile. Saves submit these flags without copying protected program/studentType values.
- Existing academic standing card already displays current status, remarks, and probation information from the authenticated identity API. Added its effective date and an explicit read-only explanation. Missing status now displays Not recorded instead of claiming Regular.
- Student history is not currently returned by the self-service API, so no history endpoint or display was introduced. Existing status remarks and probation reason remain visible when provided.
- No backend routes, schemas, permissions, API types, Admin/Faculty workflows, or GWA formulas changed.

## Acceptance evidence

Used an isolated local MongoDB database with controlled student/admin accounts; existing application records were not modified.

- API: all four flags persisted, survived a fresh login, and left another student's document unchanged.
- API: rejected forged institutionId/userId, program/studentType, academicStatus, grades/GWA; denied attempts to edit another student, academic status, or academic records. Unauthenticated profile mutation rejected.
- Browser: logged in as Student, opened Personal profile, found all four checkboxes, enabled them, saved, refreshed, and confirmed checked values.
- Browser: logged out through the account menu and logged in again; all four selections persisted.
- Admin API set Probation, Leave, and Dropped in turn. Student browser refresh displayed each exact status, matching remarks, and effective date. Status card had no editable controls.
- Authenticated endpoints reused: GET /api/me/student, PUT /api/me/student/profile, GET /api/me/student/report. Controlled admin status updates used existing PUT /api/students/:institutionId/status.

## Verification results

| Command/check | Result |
| --- | --- |
| npm --prefix client run lint | Passed |
| npm --prefix client run build | Passed |
| npm --prefix server test | 56 passed, 0 failed |
| git diff --check | Passed |
| Controlled MongoDB/API checks | 3 groups passed |
| Browser acceptance | 3 groups passed |

Added two focused validator regression tests: independent self-service flags, and rejection of malformed flags/protected fields. Temporary test services were stopped and the credential file removed after verification.
