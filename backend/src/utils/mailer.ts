import nodemailer from 'nodemailer';
import { env } from '../lib/env';

interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Real SMTP when SMTP_HOST is set (Gmail, Outlook, Brevo, Mailtrap…); otherwise
// development mode: the email is printed in the backend terminal so you can click the link.
const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : null;

export async function sendMail(mail: Mail) {
  if (!transporter) {
    console.log(
      `\n──────── EMAIL (dev mode: set SMTP_HOST in .env to really send) ────────\n` +
        `To: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n` +
        `────────────────────────────────────────────────────────────────────────\n`,
    );
    return;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, ...mail });
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
