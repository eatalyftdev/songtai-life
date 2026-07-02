---
name: Rate-limit pattern for login vs. other forms
description: How check_rate_limit() should be called for login (on failure only) vs. other forms (before submit).
---

## The rule

`check_rate_limit(bucket, identifier, max, window)` inserts a row AND checks the count in one call. It returns `true` (attempt recorded, under cap) or `false` (over cap, no insert).

**Login**: call it ONLY on failed sign-in — never before or on success. If called before, every successful login consumes a slot and locks the user out after N logins.

```ts
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  const { data: allowed } = await supabase.rpc("check_rate_limit", { ... });
  if (!rlError && allowed === false) throw new Error("Too many failed attempts...");
  throw error; // original error
}
// success — do NOT call rate limit
```

**Contact / newsletter / other write forms**: safe to call before the insert because every submission is always a "real" action.

**Why:** The stored proc is "insert-on-every-call". Calling it on a path that includes success inflates the count with legitimate actions.

**How to apply:** Whenever adding login rate limiting to an `auth.signInWithPassword` flow, move the RPC call inside the `if (error)` branch.
