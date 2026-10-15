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

## Preferred heysalad.ai option (15 October)

Peter subsequently asked to use the existing heysalad.ai domain, whose website is on Vercel. Recommended endpoint: `https://mcp.heysalad.ai/mcp`, with that new subdomain attached directly to the Cloudflare Worker. This keeps the website on Vercel and gives OAuth discovery/authorization a dedicated origin. This is a proposed address, not deployed or DNS-configured.

An apex `https://heysalad.ai/mcp` proxy is also possible, but it needs deliberate discovery handling in the owning Next.js project. Vercel external rewrites proxy requests, while its current routing documentation reserves `/.well-known` from rewrites/redirects. A single `/mcp` rewrite would leave OAuth metadata and cookie-origin behavior unresolved. If the apex path is preferred, prepare actual discovery route handlers and a fixed canonical issuer; test streaming, POST token requests, cookies, redirects, IP quota behavior through Vercel, and protected-resource audience binding before updating clients. Do not trust arbitrary forwarded host headers.

Source: [Vercel rewrites](https://vercel.com/docs/routing/rewrites), fetched 15 October 2026. No website source, production DNS, or Vercel deployment was changed.
