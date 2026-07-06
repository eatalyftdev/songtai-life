/**
 * MeSomb API client — direct fetch implementation (no SDK dependency).
 * Implements the HMAC-SHA256 signing scheme documented by MeSomb.
 */
import crypto from "crypto";

const BASE = "https://mesomb.hachther.com/en/api/v1.1";

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}
function hmacSha256Hex(key: string, data: string): string {
  return crypto.createHmac("sha256", key).update(data, "utf8").digest("hex");
}
function getMeSombDate(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildAuthorization(
  method: string,
  path: string,
  body: string,
  accessKey: string,
  secretKey: string,
  applicationKey: string,
  nonce: string,
  date: string
): string {
  const host = "mesomb.hachther.com";
  const signedHeaders = "host;x-mesomb-date;x-mesomb-nonce";
  const canonicalHeaders = `host:${host}\nx-mesomb-date:${date}\nx-mesomb-nonce:${nonce}`;
  const canonicalRequest = [
    method.toUpperCase(),
    path,
    "",
    canonicalHeaders,
    "",
    signedHeaders,
    sha256Hex(body),
  ].join("\n");

  const stringToSign = [
    "HMAC-SHA256",
    date,
    nonce,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const signature = hmacSha256Hex(secretKey, stringToSign);
  return `Algorithm=HMAC-SHA256, Credential=${accessKey}/${date}/${nonce}/${applicationKey}/mesomb_request, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

async function mesombRequest(
  method: string,
  path: string,
  payload: object,
  appKey: string,
  accessKey: string,
  secretKey: string
): Promise<{ success: boolean; data: any; message?: string }> {
  const body = JSON.stringify(payload);
  const nonce = crypto.randomUUID();
  const date = getMeSombDate();
  const authorization = buildAuthorization(method, path, body, accessKey, secretKey, appKey, nonce, date);

  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-MeSomb-ApplicationKey": appKey,
      "X-MeSomb-Date": date,
      "X-MeSomb-Nonce": nonce,
      Authorization: authorization,
    },
    body: method !== "GET" ? body : undefined,
  });

  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  const success = res.ok && (data.status === "SUCCESS" || data.success === true);
  return { success, data, message: data.message ?? data.detail ?? (res.ok ? undefined : `HTTP ${res.status}`) };
}

// ── Public API ────────────────────────────────────────────────────────────────

interface MeSombConfig {
  applicationKey: string;
  accessKey: string;
  secretKey: string;
}

export interface CollectParams {
  payer: string;      // local phone without country code, e.g. '670000000'
  amount: number;
  service: "MTN" | "ORANGE";
  nonce?: string;
  trxID?: string;
  reference?: string;
  country?: string;
  currency?: string;
  customer?: {
    email?: string; firstName?: string; lastName?: string;
    town?: string; region?: string; country?: string;
  };
  location?: { town: string; region: string; country: string };
  products?: Array<{ name: string; category: string; quantity: number; amount: number }>;
}

export interface DepositParams {
  receiver: string;   // local phone without country code
  amount: number;
  service: "MTN" | "ORANGE";
  nonce?: string;
  trxID?: string;
  country?: string;
  currency?: string;
  customer?: {
    email?: string; firstName?: string; lastName?: string;
    town?: string; region?: string; country?: string;
  };
  location?: { town: string; region: string; country: string };
}

export interface MeSombResult {
  operationSuccess: boolean;
  transactionSuccess: boolean;
  transactionId: string | null;
  status: string;
  message?: string;
  raw: any;
}

function parseResult(result: { success: boolean; data: any; message?: string }): MeSombResult {
  const txn = result.data?.transaction ?? result.data;
  const status: string = result.data?.status ?? (result.success ? "SUCCESS" : "FAILED");
  return {
    operationSuccess: result.success,
    transactionSuccess: result.success && status === "SUCCESS",
    transactionId: txn?.pk ?? txn?.id ?? null,
    status,
    message: result.message,
    raw: result.data,
  };
}

export function createMeSombClient(cfg: MeSombConfig) {
  return {
    async collect(params: CollectParams): Promise<MeSombResult> {
      const payload = {
        amount: params.amount,
        service: params.service,
        payer: params.payer,
        nonce: params.nonce ?? crypto.randomUUID(),
        trxID: params.trxID,
        reference: params.reference,
        country: params.country ?? "CM",
        currency: params.currency ?? "XAF",
        customer: params.customer,
        location: params.location ?? { town: "Yaoundé", region: "Centre", country: "CM" },
        products: params.products,
      };
      const result = await mesombRequest("POST", "/payment/online/", payload, cfg.applicationKey, cfg.accessKey, cfg.secretKey);
      return parseResult(result);
    },

    async deposit(params: DepositParams): Promise<MeSombResult> {
      const payload = {
        amount: params.amount,
        service: params.service,
        receiver: params.receiver,
        nonce: params.nonce ?? crypto.randomUUID(),
        trxID: params.trxID,
        country: params.country ?? "CM",
        currency: params.currency ?? "XAF",
        customer: params.customer,
        location: params.location ?? { town: "Yaoundé", region: "Centre", country: "CM" },
      };
      const result = await mesombRequest("POST", "/payment/deposit/", payload, cfg.applicationKey, cfg.accessKey, cfg.secretKey);
      return parseResult(result);
    },

    async checkTransaction(mesombTxId: string): Promise<{ status: string; raw: any }> {
      const nonce = crypto.randomUUID();
      const date = getMeSombDate();
      const path = `/payment/transaction/?ids=${encodeURIComponent(mesombTxId)}&source=MESOMB`;
      const authorization = buildAuthorization("GET", path, "", cfg.accessKey, cfg.secretKey, cfg.applicationKey, nonce, date);
      const res = await fetch(`${BASE}${path}`, {
        headers: {
          "X-MeSomb-ApplicationKey": cfg.applicationKey,
          "X-MeSomb-Date": date,
          "X-MeSomb-Nonce": nonce,
          Authorization: authorization,
        },
      });
      const data = await res.json().catch(() => ({}));
      const txn = Array.isArray(data) ? data[0] : data?.results?.[0] ?? data;
      return { status: txn?.status ?? "UNKNOWN", raw: data };
    },
  };
}

export function getMeSombClient() {
  const appKey    = process.env.MESOMB_APPLICATION_KEY;
  const accessKey = process.env.MESOMB_ACCESS_KEY;
  const secretKey = process.env.MESOMB_SECRET_KEY;
  if (!appKey || !accessKey || !secretKey) return null;
  return createMeSombClient({ applicationKey: appKey, accessKey, secretKey });
}
