import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const host = cfg.get<string>('SMTP_HOST') ?? 'localhost';
        const port = cfg.get<number>('SMTP_PORT') ?? 587;
        const user = cfg.get<string>('SMTP_USER') ?? '';
        const pass = cfg.get<string>('SMTP_PASSWORD') ?? '';
        const from = cfg.get<string>('SMTP_FROM') ?? 'noreply@amcportal.com';

        // Port 465 uses implicit TLS (direct SSL), most other ports use STARTTLS
        const useImplicitTls = port === 465;

        return {
          transport: {
            host,
            port,
            secure: useImplicitTls,
            requireTLS: !useImplicitTls,
            auth: { user, pass },
            family: 4,
          },
          defaults: { from },
        };
      },
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
