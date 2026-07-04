---
name: Twilio WhatsApp order notifications
description: How WhatsApp admin order alerts are implemented — Twilio REST, fire-and-forget webhook pattern, site_settings config, resend endpoint security.
---

# Twilio WhatsApp Order Notifications

## Architecture

- `sendOrderWhatsApp()` in `server.ts` — pure fetch against Twilio REST API (`/2010-04-01/Accounts/{SID}/Messages.json`) with Basic auth (`base64(SID:TOKEN)`).
- FROM number format: must be `whatsapp:+1xxxxxxxxxx` (prefixed); `TWILIO_WHATSAPP_FROM` env secret stores this.
- TO number: stored in `site_settings` key `order_notifications.whatsapp_number`, fetched fresh at notification time.

## Webhook fire-and-forget pattern

The `/api/payment/webhook` handler calls `sendOrderWhatsApp` inside a detached IIFE (`(async () => { ... })()`). This ensures a Twilio failure can never roll back a paid order or delay the `200` response.

**Why:** Order integrity > notification delivery. Retry is available via the admin Resend button.

## Resend endpoint security (critical)

`/api/payment/resend-notification` must have ALL of these before processing:
1. `req.user?.claims?.sub` check (401 if missing)
2. `profiles.role` check — must be `admin` or `superadmin` (403 otherwise)
3. Per-user rate limit (10 resends per 15 min) — `resendAttempts` Map keyed by userId
4. Audit log insert into `audit_logs` table

**Why:** Without auth, anyone knowing an `orderId` can spam admin WhatsApp. The code review caught this gap.

## Admin UI

- Settings → Order Alerts tab: toggle enabled + number field → saves to `site_settings.order_notifications`
- Orders page slide-over: shows WA notification status badge (Notified / Failed), resend button, error message
- Failed-notification indicator badge also shows inline in the orders table row

## Required env secrets

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` (e.g. `whatsapp:+14155238886`)
