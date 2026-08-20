import { Injectable, Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';

interface InviteEmailParams {
  to: string;
  workspaceName: string;
  inviterName: string;
  role: string;
  acceptUrl: string;
}

// Switches email delivery between "console" (default — logs the message,
// no external dependency, fine for local dev) and "smtp" (any SMTP
// server, e.g. Mailpit for local testing, or a real relay like SendGrid/
// SES's SMTP interface in production). Deliberately narrow — a single
// sendInviteEmail method, not a generic templating system — since
// invites are the only email this app sends.
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly driver: 'console' | 'smtp';
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor() {
    this.driver = process.env.EMAIL_DRIVER === 'smtp' ? 'smtp' : 'console';
    this.from = process.env.EMAIL_FROM || 'Shipboard <no-reply@shipboard.local>';
    if (this.driver === 'smtp') {
      this.transporter = createTransport({
        host: requireEnv('SMTP_HOST'),
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth:
          process.env.SMTP_USER && process.env.SMTP_PASS
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
      });
    }
  }

  async sendInviteEmail({ to, workspaceName, inviterName, role, acceptUrl }: InviteEmailParams): Promise<void> {
    const subject = `${inviterName} invited you to join ${workspaceName} on Shipboard`;
    const text = [
      `${inviterName} invited you to join "${workspaceName}" on Shipboard as a ${role}.`,
      '',
      `Accept the invite: ${acceptUrl}`,
      '',
      "If you weren't expecting this, you can ignore this email.",
    ].join('\n');

    if (this.driver === 'console') {
      this.logger.log(`[console email] To: ${to}\nSubject: ${subject}\n\n${text}`);
      return;
    }

    await this.transporter!.sendMail({ from: this.from, to, subject, text });
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name} for EMAIL_DRIVER=smtp.`);
  return value;
}
