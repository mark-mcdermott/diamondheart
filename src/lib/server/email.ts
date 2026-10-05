import { Resend } from "resend";

/**
 * The one place Diamondheart sends mail from.
 *
 * Everything goes through `sendEmail`, so the provider stays a contained change: Resend is
 * an implementation detail and the auth flows never name it. `diamondheart.app` is verified
 * with Resend — `resend._domainkey` signs, `send.diamondheart.app` is the envelope sender —
 * while the apex MX stays with Namecheap's forwarding, so sending here cannot break
 * receiving there.
 */

/** Sending needs no mailbox; replies are steered with `replyTo`, which does. */
const FROM = "Diamondheart <noreply@diamondheart.app>";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Where a human reply should go — the sender, not the no-reply we posted from. */
  replyTo?: string;
}

/** Whether mail can be sent at all, for callers that should skip rather than throw. */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

/**
 * Throws rather than returning a failure flag, so a caller cannot ignore a failed send.
 *
 * ⚠️ **Better Auth does not surface that for verification mail.** It runs
 * `sendVerificationEmail` as a *background task*, so this throw is logged and never reaches
 * the request: sign-up still answers 200 and the user row is created even when no mail went
 * out. The recovery path is Better Auth's own `POST /api/auth/send-verification-email`, so
 * any "check your inbox" screen must offer to resend rather than treat a 200 as proof.
 * (Observed in frunk against Better Auth 1.7.5; same library here.)
 *
 * `sendResetPassword` is **not** a background task — a failure there does reach the caller.
 */
export async function sendEmail({ to, subject, html, text, replyTo }: EmailMessage) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set — refusing to pretend the message was sent");
  }

  const { data, error } = await new Resend(key).emails.send({
    from: FROM,
    to,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) throw new Error(`Resend rejected the message: ${error.message}`);
  return data;
}

/** Shared shell so both mails look like the same app sent them. */
function layout(body: string) {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#111827;max-width:480px">
  ${body}
</div>`;
}

function button(url: string, label: string) {
  return `<p><a href="${url}" style="display:inline-block;background:#9333ea;color:#fff;text-decoration:none;padding:12px 24px;border-radius:9999px;font-weight:600">${label}</a></p>`;
}

/**
 * Better Auth's reset links expire on their own; the copy says so without naming a duration,
 * which would drift from the library's default the moment it changes.
 */
export async function sendPasswordResetEmail(to: string, url: string) {
  await sendEmail({
    to,
    subject: "Reset your Diamondheart password",
    text: `Reset your Diamondheart password:\n\n${url}\n\nThe link expires shortly. If you did not ask to reset it, ignore this message — your password will not change.`,
    html: layout(
      `<p>Reset your Diamondheart password.</p>
  ${button(url, "Choose a new password")}
  <p style="font-size:13px;color:#6b7280">The link expires shortly. If you did not ask to reset it, ignore this message — your password will not change.</p>`,
    ),
  });
}

export async function sendVerificationEmail(to: string, url: string) {
  await sendEmail({
    to,
    subject: "Verify your email address",
    text: `Confirm your address to finish setting up Diamondheart:\n\n${url}\n\nIf you did not create an account, ignore this message.`,
    html: layout(
      `<p>Confirm your address to finish setting up Diamondheart.</p>
  ${button(url, "Verify email")}
  <p style="font-size:13px;color:#6b7280">If you did not create an account, ignore this message.</p>`,
    ),
  });
}
