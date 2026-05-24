import { transporter } from '../config/mail.config';
import { config } from '../config/env.config';
import logger from '../utils/logger';

// ─── HTML helpers ──────────────────────────────────────────────────────────────

/**
 * Escapes HTML special characters to prevent injection into the email body.
 * The error message comes from unknown runtime errors — it must be sanitised.
 */
const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Maps a severity level to an accent colour for the HTML alert email.
 * Colours mirror standard alerting conventions (grey → low, dark red → fatal).
 */
const severityColor = (severity: string): string => {
  const map: Record<string, string> = {
    LOW: '#6c757d',
    MEDIUM: '#f0ad4e',
    HIGH: '#d9534f',
    CRITICAL: '#c0392b',
    FATAL: '#7b0000',
  };
  return map[severity.toUpperCase()] ?? '#6c757d';
};

/**
 * Builds a production-quality HTML alert email body.
 * Self-contained inline styles — compatible with all major email clients.
 */
const buildAlertHtml = (errorMessage: string, severity: string, timestamp: string): string => {
  const safeMessage = escapeHtml(errorMessage);
  const color = severityColor(severity);
  const env = config.server.env;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>System Alert</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:${color};padding:20px 30px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;letter-spacing:1px;">
                ⚠ SYSTEM ALERT — ${escapeHtml(severity.toUpperCase())}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:30px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom:16px;">
                    <strong style="color:#333333;font-size:14px;">Environment</strong>
                    <p style="margin:4px 0 0;color:#555555;font-size:14px;">${escapeHtml(env)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:16px;">
                    <strong style="color:#333333;font-size:14px;">Severity</strong>
                    <p style="margin:4px 0 0;">
                      <span style="background:${color};color:#ffffff;padding:3px 10px;border-radius:4px;font-size:13px;font-weight:bold;">
                        ${escapeHtml(severity.toUpperCase())}
                      </span>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:16px;">
                    <strong style="color:#333333;font-size:14px;">Error Message</strong>
                    <p style="margin:4px 0 0;color:#c0392b;font-size:14px;word-break:break-word;background:#fff5f5;padding:10px;border-left:4px solid ${color};border-radius:4px;">
                      ${safeMessage}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:16px;">
                    <strong style="color:#333333;font-size:14px;">Timestamp</strong>
                    <p style="margin:4px 0 0;color:#555555;font-size:14px;">${escapeHtml(timestamp)}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#999999;font-size:12px;border-top:1px solid #eeeeee;padding-top:16px;">
                This is an automated alert from the AllTechTamil Blogger system. Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

// ─── EmailService ───────────────────────────────────────────────────────────────

/**
 * EmailService
 *
 * Architectural layer: Service — pure side-effect delivery, no DB access, no req/res.
 * Consumed by: errorHandler.ts (via dynamic import) for HIGH/CRITICAL/FATAL alerts.
 *
 * Transporter: imported from mail.config.ts (centralized SMTP initialization).
 * Never throws to its caller — email delivery is a non-critical side effect.
 * All error message content is HTML-escaped before embedding in the template.
 */
export class EmailService {
  /**
   * Sends an HTML critical alert email to the superadmin address.
   * Silently fails on SMTP errors — never propagates to calling code.
   *
   * @param errorMessage - Raw error message from the triggering exception
   * @param severity     - Severity string: 'HIGH' | 'CRITICAL' | 'FATAL'
   */
  public static async sendAdminAlertEmail(errorMessage: string, severity: string): Promise<void> {
    const timestamp = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    try {
      const html = buildAlertHtml(errorMessage, severity, timestamp);

      const info = await transporter.sendMail({
        from: `"AllTechTamil System Alert" <${config.mail.from}>`,
        to: config.mail.adminAlertEmail, // Send to dedicated error notification email
        subject: `[${severity.toUpperCase()}] System Alert — ${config.server.env} | ${timestamp}`,
        html,
      });

      logger.info(`[EmailService] Admin alert email sent. Severity: ${severity} | MessageId: ${info.messageId}`);
    } catch (error) {
      // Email delivery must never crash the error handler.
      // Log at error level for observability but swallow the exception.
      logger.error('[EmailService] Failed to send admin alert email.', {
        severity,
        errorMessage,
        smtpError: (error as Error).message,
        stack: (error as Error).stack,
      });
    }
  }
}

/**
 * Named export consumed by errorHandler.ts via dynamic import:
 *   const { sendAdminAlertEmail } = await import('../services/email.service.js');
 */
export const sendAdminAlertEmail = EmailService.sendAdminAlertEmail;

export default EmailService;
