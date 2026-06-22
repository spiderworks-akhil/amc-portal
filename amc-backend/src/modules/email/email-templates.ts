/**
 * HTML email templates for the AMC Portal notification system.
 * Uses inline styles for maximum email client compatibility.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface ReminderEmailData {
  title: string;
  message: string;
  targetLabel: string;
  targetType: string;
  expiryDate: string;
  daysRemaining: number;
  portalUrl: string;
}

function severityColor(daysRemaining: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (daysRemaining <= 7) return { bg: '#FEE2E2', text: '#991B1B', label: 'Critical' };
  if (daysRemaining <= 14) return { bg: '#FEF3C7', text: '#92400E', label: 'Warning' };
  if (daysRemaining <= 30) return { bg: '#DBEAFE', text: '#1E40AF', label: 'Notice' };
  return { bg: '#F3F4F6', text: '#6B7280', label: 'Upcoming' };
}

function targetIcon(targetType: string): string {
  switch (targetType) {
    case 'domain': return '🌐';
    case 'ssl': return '🔒';
    case 'contract': return '📄';
    case 'server': return '🖥️';
    default: return '📌';
  }
}

export function buildReminderHtml(data: ReminderEmailData): string {
  const sev = severityColor(data.daysRemaining);
  const icon = targetIcon(data.targetType);
  const title = escapeHtml(data.title);
  const message = escapeHtml(data.message);
  const label = escapeHtml(data.targetLabel);
  const expiry = escapeHtml(data.expiryDate);
  const url = escapeHtml(data.portalUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1E40AF,#3B82F6);padding:32px 40px;text-align:center;">
              <div style="font-size:36px;line-height:1;margin-bottom:8px;">${icon}</div>
              <h1 style="margin:0;color:#FFFFFF;font-size:22px;font-weight:600;">${title}</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">AMC Portal Automated Reminder</p>
            </td>
          </tr>

          <!-- Severity Banner -->
          <tr>
            <td style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="12" cellspacing="0" style="background-color:${sev.bg};border-radius:8px;margin-top:-16px;">
                <tr>
                  <td align="center" style="color:${sev.text};font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                    ${sev.label} — ${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'} remaining
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:600;">${message}</h2>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                <tr>
                  <td style="padding:12px 16px;background-color:#F9FAFB;border-radius:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:4px 0;">
                          <span style="color:#6B7280;font-size:13px;">Entity</span>
                          <div style="color:#111827;font-size:15px;font-weight:500;">${label}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;padding-top:12px;">
                          <span style="color:#6B7280;font-size:13px;">Type</span>
                          <div style="color:#111827;font-size:15px;font-weight:500;text-transform:capitalize;">${data.targetType}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;padding-top:12px;">
                          <span style="color:#6B7280;font-size:13px;">Expiry Date</span>
                          <div style="color:#111827;font-size:15px;font-weight:500;">${expiry}</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:4px 0;padding-top:12px;">
                          <span style="color:#6B7280;font-size:13px;">Days Remaining</span>
                          <div style="color:${sev.text};font-size:15px;font-weight:600;">${data.daysRemaining}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#1E40AF;border-radius:8px;padding:0;">
                          <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">View in Portal</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background-color:#F9FAFB;border-top:1px solid #E5E7EB;">
              <p style="margin:0;color:#6B7280;font-size:12px;text-align:center;">
                This is an automated reminder from the AMC Portal.<br />
                If you have any questions, please contact your account manager.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
