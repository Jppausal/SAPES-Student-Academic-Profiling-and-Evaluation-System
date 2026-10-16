# Historical account status reconciliation

This report describes an incident from the former shared-`users`-collection design and is not an operational runbook. The old status-mirroring logic and database references described below have been retired.

The current application uses the Atlas database `sapes_dev`, validated by [server/utils/database.js](../server/utils/database.js). Accounts authenticate directly from their role-specific collections: `admin users`, `faculty users`, and `student users`. A student login and profile are the same document in `student users`; there is no linked `User` document or status mirror.

Do not use the historical `test` database, local database, or the old repair procedure as evidence of current production state. The active connection URI is configured in `server/.env` and is intentionally not recorded here.
