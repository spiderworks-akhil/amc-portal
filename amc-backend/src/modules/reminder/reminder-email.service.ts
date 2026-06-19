import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

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
export class ReminderEmailService {
  private readonly logger = new Logger(ReminderEmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    const recipientLabel = Array.isArray(options.to)
      ? options.to.join(', ')
      : options.to;

    try {
      const info = (await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      })) as { messageId: string };

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
}
