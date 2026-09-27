# SAPES Current Status

Updated: 2026-09-27

SAPES currently has working backend foundations for authentication, RBAC, student self-service profiles, student reports, faculty evaluations, status history, audit logs, and administrator user management.

The current verified student-profile slice covers:

- T104 personal information
- T105 IP, PWD, shifter, transferee, and student-type classification
- T106 religion
- authenticated self-service persistence
- strict profile-field validation
- shared profile access for authorized faculty and administrators

Security and integrity controls now include current account-status checks on every protected request, session revocation for security-sensitive account changes, immutable student account identifiers, and a unique required `Student.userId` relationship.

The administrator academic-record workspace now reads and writes MongoDB-backed term records, validates complete subject payloads, refreshes the calculated major-subject GWA, and records academic-status history through the backend.

The faculty portal now uses the protected backend report, evaluation, and status APIs as its rendered source of truth. The application remains partially transitional because institutional reporting views still use browser-local data and must be replaced before the application can be considered fully integrated.

Local MongoDB-to-Atlas synchronization remains planned and has not been implemented.
