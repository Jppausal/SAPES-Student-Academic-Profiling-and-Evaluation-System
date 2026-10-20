# Admin navigation organization — 2026-10-20

- Replaced the crowded horizontal admin navigation with grouped navigation: Student records, Access management, and System.
- Shortened workspace headings and navigation labels. Account creation is shown only while managing User accounts.
- Renamed the profile-menu destination and dialog to My account, explicitly covering personal password and notification preferences. This shared label is consistent for all roles.
- Renamed App Settings to System settings and made it the single admin destination for app-wide configuration.
- Split system configuration into focused categories, opening Integrations by default. Existing API calls, save behavior, permissions, and audit handling are unchanged.
- Added static, keyboard-focusable switch styling and responsive navigation. No animations or transitions were added; admin workspace transitions are disabled.

Design uses the existing modern sans-serif family, navy #073474, white #ffffff, slate text #172033, muted #607086, and borders #d8e0e9. Content is left aligned; student-record work, access management, and system operations have separate groups.

Validation: frontend lint and build passed; existing bundle-size warning remains. Browser verified navigation selection, five settings categories, contextual account creation, My account dialog, and widths 1440/768/390 without horizontal overflow. Desktop screenshot reviewed. git diff --check passed. No backend changes were needed. Existing unrelated work remains unstaged.
