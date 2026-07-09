---
name: vercel-lockfile-registry-fix
description: package-lock.json gets internal package-firewall URLs baked in whenever npm install runs in this Replit env, breaking Vercel builds.
---

Running `npm install` inside this Replit environment rewrites `package-lock.json` "resolved" URLs to point at Replit's internal package firewall (`http://package-firewall.replit.local/npm`), which Vercel's build machine cannot reach, causing `npm install` to fail during deployment (sometimes surfacing as a generic "Exit handler never called!" npm crash rather than a clear DNS/network error).

**Why:** the repo's local npm registry is configured to Replit's internal firewall for security/speed in-workspace, but that URL is only reachable from inside Replit, not from Vercel's build machine.

**How to apply:** this repo has a `fix:lockfile` npm script (`sed`-replaces the internal URL with `https://registry.npmjs.org`) — run `npm run fix:lockfile` and commit `package-lock.json` any time you run `npm install`/`npm install <pkg>` locally before pushing, or before troubleshooting a Vercel "npm install exited with 1" failure. Check with `grep -c package-firewall package-lock.json` (should be 0).
