// ── DomainProvider — platform-agnostic custom domain adapter ─────────────────
//
// All custom-domain lifecycle operations (add, verify, remove) go through this
// interface. Swap DOMAIN_PROVIDER to change the implementation without touching
// any other application code.
//
// Supported values for the DOMAIN_PROVIDER env var:
//   vercel   (default) — Vercel Domains API
//   netlify  — Netlify Domains API (implement NetlifyDomainProvider when needed)
//   none     — no-op; useful for local dev / platforms without a domain API
//
// The active provider is resolved once at startup via createDomainProvider().
// Calling code only depends on the DomainProvider interface — never on a
// specific implementation class.

export interface DnsRecord {
  /** DNS record type, e.g. "CNAME" or "TXT". */
  type: string;
  /** The host / name part of the record (what goes in the "Host" field at the registrar). */
  domain: string;
  /** The record value / target. */
  value: string;
}

export interface DomainProvider {
  /**
   * Register a domain with the hosting platform.
   * Returns the DNS records the partner must set at their registrar.
   * Throws on unrecoverable errors; logs and swallows transient ones internally.
   */
  addDomain(domain: string): Promise<{ dnsRecords: DnsRecord[] }>;

  /**
   * Query whether the hosting platform has confirmed the domain is verified.
   * Returns the current verification state and any outstanding DNS records.
   * Throws on unrecoverable errors.
   */
  checkVerification(domain: string): Promise<{ verified: boolean; dnsRecords: DnsRecord[] }>;

  /**
   * Remove a domain from the hosting platform project.
   * Must not throw if the domain is already gone (idempotent).
   */
  removeDomain(domain: string): Promise<void>;
}

// ── VercelDomainProvider ─────────────────────────────────────────────────────

class VercelDomainProvider implements DomainProvider {
  private readonly token: string;
  private readonly projectId: string;

  constructor(token: string, projectId: string) {
    this.token = token;
    this.projectId = projectId;
  }

  async addDomain(domain: string): Promise<{ dnsRecords: DnsRecord[] }> {
    const res = await fetch(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(this.projectId)}/domains`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: domain }),
      }
    );
    const data = await res.json() as any;
    if (!res.ok && data?.error?.code !== "domain_already_in_use") {
      console.error("[DomainProvider:Vercel] addDomain error:", data);
      throw new Error(data?.error?.message ?? `Vercel returned ${res.status}`);
    }
    return { dnsRecords: this.mapVerification(data.verification ?? [], domain) };
  }

  async checkVerification(domain: string): Promise<{ verified: boolean; dnsRecords: DnsRecord[] }> {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(this.projectId)}/domains/${encodeURIComponent(domain)}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    const data = await res.json() as any;
    if (!res.ok) {
      console.error("[DomainProvider:Vercel] checkVerification error:", data);
      throw new Error(data?.error?.message ?? `Vercel returned ${res.status}`);
    }
    return {
      verified: data.verified === true,
      dnsRecords: this.mapVerification(data.verification ?? [], domain),
    };
  }

  async removeDomain(domain: string): Promise<void> {
    const res = await fetch(
      `https://api.vercel.com/v9/projects/${encodeURIComponent(this.projectId)}/domains/${encodeURIComponent(domain)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${this.token}` } }
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as any;
      // 404 / domain_not_found means already gone — treat as success
      if (res.status === 404 || data?.error?.code === "domain_not_found") return;
      console.error("[DomainProvider:Vercel] removeDomain error:", data);
      throw new Error(data?.error?.message ?? `Vercel returned ${res.status}`);
    }
  }

  private mapVerification(raw: any[], fallbackDomain: string): DnsRecord[] {
    return raw.map((r: any) => ({
      type:   r.type   ?? "CNAME",
      domain: r.domain ?? fallbackDomain,
      value:  r.value  ?? "",
    }));
  }
}

// ── NetlifyDomainProvider (stub) ─────────────────────────────────────────────
// Implement this when deploying the partners platform to Netlify.
// See: https://open-api.netlify.com/#tag/domain
//
// class NetlifyDomainProvider implements DomainProvider {
//   constructor(private token: string, private siteId: string) {}
//   async addDomain(domain: string) { ... }
//   async checkVerification(domain: string) { ... }
//   async removeDomain(domain: string) { ... }
// }

// ── NullDomainProvider ───────────────────────────────────────────────────────
// Used when DOMAIN_PROVIDER=none or required credentials are absent.
// Logs clearly; never throws; always returns safe defaults.

class NullDomainProvider implements DomainProvider {
  async addDomain(domain: string): Promise<{ dnsRecords: DnsRecord[] }> {
    console.warn(`[DomainProvider:none] addDomain("${domain}") — no provider configured. Set DOMAIN_PROVIDER and the corresponding credentials.`);
    return { dnsRecords: [] };
  }
  async checkVerification(domain: string): Promise<{ verified: boolean; dnsRecords: DnsRecord[] }> {
    console.warn(`[DomainProvider:none] checkVerification("${domain}") — no provider configured.`);
    return { verified: false, dnsRecords: [] };
  }
  async removeDomain(domain: string): Promise<void> {
    console.warn(`[DomainProvider:none] removeDomain("${domain}") — no provider configured.`);
  }
}

// ── Factory ──────────────────────────────────────────────────────────────────
// Call once at module load. The returned instance is shared for the process
// lifetime. All domain-lifecycle code calls this interface — never a concrete
// class directly — so swapping platforms is a one-line env-var change.

export function createDomainProvider(): DomainProvider {
  const selected = (process.env.DOMAIN_PROVIDER ?? "vercel").toLowerCase().trim();

  if (selected === "vercel") {
    const token     = process.env.VERCEL_API_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    if (token && projectId) {
      console.log("[DomainProvider] Using VercelDomainProvider.");
      return new VercelDomainProvider(token, projectId);
    }
    console.warn("[DomainProvider] VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set — custom domain management disabled. Set both to enable it.");
  } else if (selected === "netlify") {
    // Uncomment when NetlifyDomainProvider is implemented:
    // const token  = process.env.NETLIFY_API_TOKEN;
    // const siteId = process.env.NETLIFY_SITE_ID;
    // if (token && siteId) return new NetlifyDomainProvider(token, siteId);
    console.warn("[DomainProvider] NetlifyDomainProvider is not yet implemented — falling back to NullDomainProvider.");
  } else if (selected !== "none") {
    console.warn(`[DomainProvider] Unknown DOMAIN_PROVIDER="${selected}" — expected "vercel", "netlify", or "none". Falling back to NullDomainProvider.`);
  }

  return new NullDomainProvider();
}
