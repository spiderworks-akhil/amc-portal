import { Injectable, Logger } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '../config/config.service';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly envConfig: NestConfigService,
  ) {}

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const recipientLabel = Array.isArray(options.to)
      ? options.to.join(', ')
      : options.to;

    try {
      const transporter = await this.createTransporter();
      const info = await transporter.sendMail({
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent to ${recipientLabel}: ${info.messageId}`);
      return { success: true, providerMessageId: info.messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(
        `Failed to send email to ${recipientLabel}: ${message}`,
      );
      return { success: false, error: message };
    }
  }

  private async createTransporter(): Promise<nodemailer.Transporter> {
    let host = this.envConfig.get<string>('SMTP_HOST') ?? 'localhost';
    let port = this.envConfig.get<number>('SMTP_PORT') ?? 587;
    let user = this.envConfig.get<string>('SMTP_USER') ?? '';
    let pass = this.envConfig.get<string>('SMTP_PASSWORD') ?? '';
    let from = this.envConfig.get<string>('SMTP_FROM') ?? 'noreply@amcportal.com';
    let fromName = '';
    let encryption = '';

    try {
      const row = await this.configService.getConfig('smtp');
      const smtp = row.config as unknown as Record<string, unknown>;
      if (smtp.host) host = smtp.host as string;
      if (smtp.port) port = Number(smtp.port);
      if (smtp.user) user = smtp.user as string;
      if (smtp.password) pass = smtp.password as string;
      if (smtp.from_email) from = smtp.from_email as string;
      if (smtp.from_name) fromName = smtp.from_name as string;
      if (smtp.encryption) encryption = smtp.encryption as string;
    } catch {
      // DB config not found — fall back to env vars
    }

    let secure = false;
    let requireTLS = true;

    if (encryption === 'ssl') {
      secure = true;
      requireTLS = false;
    } else if (encryption === 'tls') {
      secure = false;
      requireTLS = true;
    } else {
      secure = port === 465;
      requireTLS = port !== 465;
    }

    const defaultFrom = fromName
      ? `"${fromName}" <${from}>`
      : from;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      requireTLS,
      auth: { user, pass },
      family: 4,
    }, { from: defaultFrom });

    return transporter;
  }
}
