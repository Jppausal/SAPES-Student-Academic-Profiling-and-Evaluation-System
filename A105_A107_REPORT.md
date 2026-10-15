# A105-A107 report status

This report described work against the former shared `users` collection and local
MongoDB databases. Its data-reconciliation results and migration instructions do
not apply to the current application and must not be used as operational guidance.

The active application uses MongoDB Atlas database `sapes_dev`, with authentication
and account status stored directly in the `admin users`, `faculty users`, and
`student users` collections. See [README.md](./README.md) and
[docs/ACCOUNT_STATUS_RECONCILIATION.md](./docs/ACCOUNT_STATUS_RECONCILIATION.md)
for the current architecture.
