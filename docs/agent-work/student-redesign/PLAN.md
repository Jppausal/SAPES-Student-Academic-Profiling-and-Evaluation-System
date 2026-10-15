# Student portal redesign

Baseline: clean workspace at 2ff90e32890ffb417368ae942223ebc501ef2c00. Date: 2026-10-07.

## Design contract

Academic record workspace for BukSU students. Put semester-specific grades first, personal forms on a second view. Retain real MongoDB API data, role boundaries, GWA values and form submission behavior. No backend/authentication changes, new data sources, inferred evaluations, or automatic Git commits.

Composition: student identity header; two clear navigation choices; period toolbar; transcript-like table with aligned numeric columns; current academic standing and available evaluation information distinctly labeled; personal-profile editor with section index and consistent grouped fields. Mobile stacks the layout; only the grade table scrolls horizontally.

Typography: Inter when available, followed by the app's modern system sans-serif stack for headings, forms, and tables, with tabular numerals for academic data. Colors: white, navy #172F47, gold #9A741A, passed green, at-risk rust, pending amber, and subtle slate surfaces. No decorative gradients, card grids, heavy shadows, redundant icons, motion, or generic marketing copy. Status colors supplement text and use actual recorded status, never inferred GWA thresholds.

Use frontend-design and context-relevant redesign guidance from design-taste-frontend; its marketing/landing requirements for photography, heroes and sparse data do not apply to this data workspace. Variance 3, motion 1, density 6. Existing institutional branding is retained.

## One implementation phase

Flash owns student components, a student-scoped stylesheet, minimal student-only App wrapper changes if needed, and task evidence/report. Preserve all fields and handlers, profile access during report failure, available-period navigation, malformed/empty/error states, accessibility and saving feedback. Refactor cosmetic markup without erasing legacy shared components. No dependency/framework migration. Root owns this plan and final acceptance.

Validation: client lint/build with exit codes; browser screenshots desktop/mobile and interaction checks with deterministic intercepted API responses only in a test harness (never product mocks); verify period switching, profile navigation/save, missing-data states. Report any browser limitation. Review actual patch for specification, correctness, accessibility, isolation from other roles, and data integrity. No commits/push.

## Routing

Installed doctor: static-ready, root gpt-6-astra, worker deepseek/deepseek-v4.1-flash via DeepSeek API, native astra_flash_builder available. Runtime provider metadata still needs evidence; no paid probe performed.
