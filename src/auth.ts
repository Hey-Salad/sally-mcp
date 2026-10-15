import fontFaces from "../ui/brand-fonts.css";
import { AuthorizationError } from "@cloudflare/workers-oauth-provider";
import { z } from "zod";
import type { Env } from "./types";
import { upstream } from "./tools";
import { limit, pseudonym } from "./privacy";
import { DISPLAY_NAME, HEYSALAD_MARK_SVG } from "./brand";
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const html = (body: string, headers = new Headers(), status = 200) => {
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; font-src data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  );
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Connect ${DISPLAY_NAME}</title><style>${fontFaces}body{font:18px Figtree,system-ui,sans-serif;background:#fff8f6;color:#1f1416;max-width:540px;margin:8vh auto;padding:24px}h1{font-family:Grandstander,cursive;color:#ed4c4c}.brand-mark{width:60px;height:auto}button[value=deny]{background:#faa09a}a{color:#a32128}input,button{font:inherit;padding:12px;margin:8px 0;display:block}button{background:#ed4c4c;color:#1f1416;border:0;border-radius:12px}small{display:block}</style><div class="brand-mark" role="img" aria-label="HeySalad icon">${HEYSALAD_MARK_SVG.replace('width="50mm" height="41mm"', 'width="60" height="49"')}</div><h1>${DISPLAY_NAME}</h1><p>love your food</p>${body}<p>HeySalad Inc. · <a href="https://heysalad.ai/sally/privacy">Privacy</a></p></html>`,
    { status, headers },
  );
};
export async function authorize(req: Request, env: Env) {
  const oauth = env.OAUTH_PROVIDER;
  const scopeLabel = (scope: string) =>
    ({
      "sally:tools":
        "Match groceries, explain choices, convert recipes, and prepare a shopping handoff.",
      offline_access: "Keep this connection available for up to one day.",
    })[scope] ?? scope;
  try {
    if (req.method === "GET") {
      const auth = await oauth.parseAuthRequest(req);
      const details = await oauth.describeConsent(auth);
      const consent = await oauth.beginConsent(auth);
      return html(
        `<p>Connect to <strong>${esc(details.clientName)}</strong>. ${details.clientDomain ? `Publisher: ${esc(details.clientDomain)}.` : "The client name is self-declared."}</p><p>Access returns to <strong>${esc(details.redirectHost)}</strong>.</p>${details.redirectIsLoopback ? "<p>This grants access to an app on your computer. Continue only if you started this sign-in.</p>" : ""}<p>This client can:</p><ul>${details.scope.map((scope) => `<li>${esc(scopeLabel(scope))}</li>`).join("")}</ul><p>You always check out and pay.</p><form method="post" action="/authorize/send"><input type="hidden" name="handle" value="${esc(consent.handle)}"><label>Sally account email<input name="email" type="email" required autocomplete="email" maxlength="254"></label><button name="decision" value="approve">Email a sign-in code</button><button name="decision" value="deny" formnovalidate>Deny</button></form>`,
        consent.headers,
      );
    }
    if (
      req.method !== "POST" ||
      req.headers.get("Origin") !== env.PUBLIC_ORIGIN
    )
      return html(
        "<p>Invalid sign-in request. Start again from your client.</p>",
        undefined,
        400,
      );
    const form = await req.formData();
    const handle = z.string().min(20).max(500).parse(form.get("handle"));
    if (form.get("decision") === "deny") {
      const r = await oauth.denyConsent(req, handle);
      r.headers.set("Location", r.redirectTo);
      return new Response(null, { status: 302, headers: r.headers });
    }
    if (new URL(req.url).pathname === "/authorize/send") {
      const approved = await oauth.approveConsent(req, handle);
      const email = z
        .string()
        .email()
        .max(254)
        .parse(form.get("email"))
        .trim()
        .toLowerCase();
      const ip = await pseudonym(
        env,
        `auth:${req.headers.get("CF-Connecting-IP") ?? "local"}`,
      );
      const mailbox = await pseudonym(env, `email:${email}`);
      if (
        !(await limit(env, ip, "otp-send", 5, 600)) ||
        !(await limit(env, mailbox, "otp-email", 3, 600))
      )
        return html(
          "<p>Too many sign-in requests. Try again later.</p>",
          approved.headers,
          429,
        );
      await upstream(env, "/api/auth/send-email-otp", { email });
      const nonce = crypto.randomUUID();
      const browser = crypto.randomUUID();
      // Temporary account identity only; never store the OTP. Browser-bound and expires after 10 minutes.
      await env.OAUTH_KV.put(
        `login:${nonce}`,
        JSON.stringify({ email, auth: approved.request, browser }),
        { expirationTtl: 600 },
      );
      approved.headers.append(
        "Set-Cookie",
        `__Host-sally-login=${browser}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
      );
      return html(
        `<p>Enter the code sent to your Sally email. Approving connects this client to Sally.</p><form method="post" action="/authorize/complete"><input type="hidden" name="handle" value="${nonce}"><label>Email code<input name="code" inputmode="numeric" pattern="[0-9]{6}" required autocomplete="one-time-code"></label><button>Connect Sally</button></form>`,
        approved.headers,
      );
    }
    if (new URL(req.url).pathname !== "/authorize/complete")
      return html("<p>Not found.</p>", undefined, 404);
    const saved = await env.OAUTH_KV.get<{
      email: string;
      auth: Parameters<typeof oauth.completeAuthorization>[0]["request"];
      browser: string;
    }>(`login:${handle}`, "json");
    const browser = req.headers
      .get("Cookie")
      ?.match(/(?:^|;\s*)__Host-sally-login=([^;]+)/)?.[1];
    if (!saved || saved.browser !== browser)
      return html("<p>Sign-in expired. Start again.</p>", undefined, 400);
    if (
      !(await limit(
        env,
        await pseudonym(env, `login:${handle}`),
        "otp-verify",
        5,
        600,
      ))
    )
      return html(
        "<p>Too many code attempts. Start again.</p>",
        undefined,
        429,
      );
    const code = z
      .string()
      .regex(/^\d{6}$/)
      .parse(form.get("code"));
    const signed = z
      .object({
        token: z.string().min(20),
        user: z.object({ id: z.string().min(1) }),
      })
      .parse(
        await upstream(env, "/api/auth/verify-email-otp", {
          email: saved.email,
          code,
        }),
      );
    await env.OAUTH_KV.delete(`login:${handle}`);
    const result = await oauth.completeAuthorization({
      request: saved.auth,
      userId: signed.user.id,
      metadata: {},
      scope: saved.auth.scope,
      props: {
        userId: signed.user.id,
        upstreamToken: signed.token,
        scopes: saved.auth.scope,
      },
    });
    return new Response(null, {
      status: 302,
      headers: {
        Location: result.redirectTo,
        "Cache-Control": "no-store",
        "Set-Cookie":
          "__Host-sally-login=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError && error.redirectTo)
      return Response.redirect(error.redirectTo, 302);
    return html(
      "<p>Sign-in could not be completed. Retry from your client or contact peter@heysalad.ai.</p>",
      undefined,
      400,
    );
  }
}
