---
name: Admin bootstrap endpoint security pattern
description: Required guards for a one-time superadmin creation endpoint on the Express server.
---

## The rule

A `/api/admin/bootstrap` endpoint must have three guards or it is a privilege-escalation vector:

1. **Static key check** — `ADMIN_BOOTSTRAP_KEY` env var compared to request body.
2. **"No superadmin exists" DB check** — query `profiles` for `role = 'superadmin'`; if any row exists, return 409. Disables the endpoint after first use.
3. **IP-level rate limiting** — in-memory map, 3 attempts per 15 min per IP, checked before any key comparison to prevent brute force.

**Why:** A key-only check is a single point of failure. If the key leaks, an attacker can create unlimited superadmin accounts. The existence check makes bootstrap self-disabling after first use.

**How to apply:** Any similar "create first admin" or "initial setup" route needs all three. The in-memory rate limiter is sufficient here (endpoint is only used once per deploy lifetime).
