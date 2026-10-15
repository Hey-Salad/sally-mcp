# Backend contract and release boundaries

Inspected 15 October 2026 (Europe/London).

The MCP staging Worker points at `https://sally-api-dev.heysalad-o.workers.dev`. Production `sally-api` and `shopping-agent` were not deployed by this work.

Source inspected: Hey-Salad/heysalad-payme, `dev/sally-api-dev-integration`, commit `0b919ad5c2788d364acf5e10a95037881f0cdc08`; `sally-api/src/routes/extension.ts`, `sally-api/src/services/sense-check.ts`, and `docs/sally/logging.md`. The earlier stack includes PR #21 on `cursor/sally-1030-tiered-agentic`. The caller-supplied `/api/match-product` description does not match the integration branch’s current Sally API source: the traced sense check is `POST /api/extension/ai/sense-check`.

- Per-candidate: `line`, `chosen` product card, `candidates`, `runId`, `itemIndex` → `verdict: confirm|veto`, `reason`, `confidence` (nullable), `model`, `fallback`.
- The backend’s chain is Luna Decisions → Sol Responses → Luna Responses. MCP never calls OpenAI directly or carries an OpenAI key.
- `POST /api/ai/generate-list` receives `{input,servings}` and returns `{items}`. Its source can prefer saved household size over requested servings. MCP explicitly returns an amber scaling note.
- `POST /api/auth/send-email-otp` and `/verify-email-otp` implement the account sign-in step. MCP OAuth is separate and uses resource-bound provider tokens.
- `POST /api/auth/guest-session` supplies anonymous upstream access. This is a necessary backend guest account, not a user account impersonation. The initial guest credential is a Worker secret; daily renewal stores a short-lived guest credential in KV.
- There is no catalogue search API: candidates come from retailer-page selectors or the user. The MCP server does not scrape retailer pages.
- `basket_link` does not call legacy autonomous-shopping, checkout, or payment endpoints. It returns only a retailer URL and instructions.

The backend debug API is not exposed as an MCP tool. Run IDs are generated per call and can be inspected by an authorised backend operator using `docs/sally/logging.md`; MCP D1 logs contain no grocery text.

## Rules and Sally-Nano

Reference: `sally-model/phase-1`, report at commit `783d766`, `sally-model/overnight/REPORT.md`. The winning checkpoint is `s5-nano1x64-mf12-s0` int8. The repository describes the checkpoint but does not contain trained weights.

The current MCP layer runs a **TypeScript port** of the Python rules as a shadow check. Parity is tested against 25 fixtures generated from the Python reference, including size/unit, multipack, type/form and preference flags. `NANO_SHADOW_URL` optionally enables `/predict` on a dedicated HTTPS inference service, requiring `{probability,model,sha256}` and the matching pinned `NANO_SHADOW_SHA256`. Optional `NANO_SHADOW_TOKEN` stays in Worker secrets. Nano errors never alter the authoritative API verdict, and unavailable/error status is returned explicitly.

Prepared owning-API change: [draft PR #29](https://github.com/Hey-Salad/heysalad-payme/pull/29), disabled by default and not deployed.

Pending: obtain the trained checkpoint and matching preprocessing metadata; implement and verify the inference runtime; merge and validate the prepared dev-only rules + Nano shadow hook in the owning Sally API, then enable its flag and log agreement in its existing `ai_usage_logs`. The optional MCP shadow adapter alone does **not** complete that backend task. Do not promote shadow verdicts into decisions or claim benchmark figures establish live correctness.

## Public-launch blockers

Before a production rollout, review the owning Sally API’s existing OTP/debug logging and retention. The source inspected includes code/email debug logging in the OTP route and line/product observability in dev sense checks; the new MCP D1 does not retain those payloads. Reconcile those policies and code before publishing a privacy policy that describes the whole service.
