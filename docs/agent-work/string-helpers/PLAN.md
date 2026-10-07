# String helpers

## Design and contract

Add the requested root `utils/string_helpers.js` as a dependency-free CommonJS
module exporting `slugify(text)` and `truncateWords(text, maxWords)`. The server
already uses CommonJS and `node --test`; use `server/test/stringHelpers.test.js`
so the existing test command discovers the new tests. No consumer integration,
package changes, transliteration library, or unrelated refactoring is needed.

- Both helpers accept primitive strings and throw TypeError for other input.
- slugify: normalize NFD, remove Unicode combining marks, lowercase, replace
  runs outside ASCII a-z/0-9 with a single hyphen, trim edge hyphens. Empty or
  separator-only input yields an empty string. Example: `  Café & Tea! ` becomes
  `cafe-tea`. ASCII is a deliberate contract; non-Latin transliteration is out
  of scope.
- truncateWords: require a nonnegative safe integer maxWords (TypeError for
  non-numbers, RangeError for invalid numeric values). Split on whitespace,
  discard empty tokens, join with single spaces. Return at most maxWords tokens
  and append literal `...` only if words were omitted and maxWords > 0. Zero
  returns an empty string. Preserve punctuation within words. Empty input
  returns an empty string after argument validation.
- Include concise JSDoc documenting behavior and invalid arguments.

## Baseline and ownership

Repository: C:/Projects/SAPES-Student-Academic-Profiling-and-Evaluation-System
Branch main, HEAD 8f7b70b3704afa6a01a042ff2d67aefc303897c5. No staged changes or
untracked files at initial inspection. Existing modifications must remain intact:

- client/src/lib/api.ts SHA256 C48E3E205BBD953C3B52E7D419AAD3A65410699A0206ECF63040913229AEE95C
- server/routes/authRoutes.js SHA256 3B0D82FB45FB8DE596C00F3234CC95607F2E2D46B732B5A5962D3C6D2D989F1A

Astra owns this plan and CHECKPOINT.md. Flash owns only the helper, its test file,
and `docs/agent-work/string-helpers/worker-report.md`.

## Single phase: SH-1

One astra_flash_builder discovers relevant conventions, implements both helpers,
adds behavioral tests, runs and fixes tests, and reports evidence. Test ordinary
input, empty/whitespace input, separators/punctuation, accents and combining
marks, digits, non-Latin-only slug input, truncation boundaries, whitespace
normalization, zero, invalid types, negative/fractional/nonfinite/unsafe limits.
Run `node --test server/test/stringHelpers.test.js` from the root, then
`npm test --prefix server` if the suite is self-contained and needs no external
service. Record commands, exit codes, and pass/fail counts. No dependencies,
commits, staging, deployments, recursive agents, or routing configuration edits.

Astra reviews tests and implementation for contract compliance, simplicity,
correctness, security, and scope. One consolidated correction cycle if needed.
Accept only with successful relevant verification. Report unrelated test failures
without modifying unrelated files. Checkpoint if blocked; otherwise complete the
bundle without requesting routine approvals or sending status reports.

## Routing

Installed doctor reports static-ready: gpt-6-astra root, high effort;
deepseek/deepseek-v4.1-flash worker, high effort, DeepSeek API provider. The native
astra_flash_builder role is exposed. No project .codex override was found.
Runtime inference routing awaits host/router metadata from this useful task.

## Status

Blocked before implementation: the native Flash worker request returned HTTP 402
Insufficient Balance from DeepSeek. No implementation or tests were produced.
Resume the same worker after provider access is restored; no model fallback.
