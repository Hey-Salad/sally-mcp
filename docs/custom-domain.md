# Requested Sally endpoint: heysalad.app/mcp

Peter requested this endpoint on 15 October 2026. It is feasible, but not deployed.

Observed: the apex is an active Cloudflare zone; `/mcp` responds with HTTP 301 to `https://heysalad.ai/`. Existing Worker routes do not claim `/mcp`. Available credentials can list Worker routes but receive HTTP 403 when reading DNS and redirect rules. Changing Worker routes alone would not establish that the earlier redirect is bypassed.

Before applying a domain change:

1. Inspect the owning redirect rule and prepare an exception for Sally’s MCP, OAuth discovery, authorization and token paths. Preserve all unrelated redirects.
2. Check the apex DNS proxy state and any existing OAuth/discovery paths. The current implementation uses `/mcp`, `/.well-known/oauth-protected-resource/mcp`, `/.well-known/oauth-authorization-server`, `/authorize` and its subpaths, `/oauth/register`, `/oauth/token`, and `/brand/heysalad.svg`. Confirm every additional endpoint advertised by the installed provider. Reserve or explicitly namespace these paths before selecting routes; never overwrite another service’s authorization endpoints.
3. Prepare a separate canonical deployment with `PUBLIC_ORIGIN=https://heysalad.app`, approved upstream, explicit bindings and Worker secrets. Keep staging working. OAuth resource/issuer and redirect registration must agree with the new origin. Treat old grants as belonging to the old issuer; reconnect clients rather than copying browser consent sessions.
4. Obtain Peter’s approval for the concrete production route/redirect changes, then deploy. Validate HTTPS, no redirect on discovery/MCP, real OAuth sign-in, refresh/revocation, anonymous quota, all four tools, ChatGPT widget CSP and Codex against the new URL.
5. Only after validation, update the public plugin/config and submission links.

No public URL should be claimed live until those checks pass. The current tested endpoint remains `https://sally-mcp-staging.heysalad-o.workers.dev/mcp`.
