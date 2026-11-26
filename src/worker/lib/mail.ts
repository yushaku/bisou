import type { Locale } from "../../shared/types";
import type { Env } from "../env";
import { log } from "./logger";

const RESEND_URL = "https://api.resend.com/emails";
const FROM = "Bisou <no-reply@mail.yuchi-education.com>";

const copy: Record<Locale, { subject: (code: string) => string; intro: string; expiry: string; ignore: string }> = {
  vi: {
    subject: (code) => `Mã đăng nhập Bisou: ${code}`,
    intro: "Mã đăng nhập Bisou của bạn là:",
    expiry: "Mã có hiệu lực trong 10 phút.",
    ignore: "Nếu bạn không yêu cầu mã này, hãy bỏ qua email.",
  },
  en: {
    subject: (code) => `Your Bisou login code: ${code}`,
    intro: "Your Bisou login code is:",
    expiry: "The code is valid for 10 minutes.",
    ignore: "If you did not ask for this code, you can ignore this email.",
  },
};

function buildOtpMail(code: string, locale: Locale): { subject: string; text: string; html: string } {
  const t = copy[locale];
  const text = `${t.intro}\n\n${code}\n\n${t.expiry}\n${t.ignore}\n`;
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;padding:24px;background:#eff1f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#4c4f69">
<div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;text-align:center">
<p style="margin:0 0 8px;font-size:16px">${t.intro}</p>
<p style="margin:16px 0;font-size:40px;font-weight:700;letter-spacing:8px;color:#ea76cb;font-family:ui-monospace,Menlo,monospace">${code}</p>
<p style="margin:0 0 4px;font-size:14px;color:#6c6f85">${t.expiry}</p>
<p style="margin:0;font-size:13px;color:#8c8fa1">${t.ignore}</p>
</div></body></html>`;
  return { subject: t.subject(code), text, html };
}

export type SendResult = "sent" | "unavailable" | "failed";

export async function sendOtpMail(env: Env, to: string, code: string, locale: Locale): Promise<SendResult> {
  if (!env.RESEND_API_KEY) {
    log("info", "mail_unavailable", {
      errorCode: "resend_key_missing",
      devOtp: env.ENVIRONMENT === "development" ? { email: to, code } : undefined,
    });
    return "unavailable";
  }
  const mail = buildOtpMail(code, locale);
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], subject: mail.subject, text: mail.text, html: mail.html }),
    });
    if (!res.ok) {
      log("error", "mail_failed", { errorCode: "resend_response", status: res.status });
      return "failed";
    }
    return "sent";
  } catch {
    log("error", "mail_failed", { errorCode: "resend_request_failed" });
    return "failed";
  }
}
