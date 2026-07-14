---
name: Hosting portal session cookie design
description: How the customer-facing hosting portal authenticates without a full user-account/auth system
---

The Lumora hosting portal authenticates customers who have received a
one-time, staff-issued access key (via Discord `/genkey`) rather than having
real user accounts.

**Decision:** Use `cookie-parser`'s built-in signed-cookie support
(`cookieParser(SESSION_SECRET)`, `res.cookie(name, value, { signed: true,
httpOnly: true, sameSite: "lax" })`, read back via `req.signedCookies`)
instead of hand-rolling JWT/HMAC. The cookie payload is minimal —
`{ keyId }` — and every request re-fetches the `hostingKeys` DB row to check
`status`/`expiresAt` rather than trusting an expiry embedded in the cookie
itself.

**Why:** `cookie-parser` was already a dependency; a bearer-token/JWT scheme
would have added a library and given up instant revocation (an embedded JWT
expiry can't be invalidated early if staff need to revoke a key). Re-checking
the DB row on every request means revoking a key take effect immediately.

**How to apply:** Reuse this pattern for any future feature that needs
short-lived, staff-granted access without full user accounts. Do not embed
authorization decisions (expiry, revocation) only in the cookie — always
revalidate against the source-of-truth DB row.
