import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const WORKSUITE_LOGO_URL = 'https://res.cloudinary.com/nr1r5044/image/upload/v1787392623/worksuite_hrms/logo.png';

export interface EmailTemplateOptions {
  title: string;
  badgeText?: string;
  badgeColor?: string; // e.g. '#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#6366f1'
  recipientName?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export function buildProfessionalEmailHtml(options: EmailTemplateOptions): string {
  const {
    title,
    badgeText,
    badgeColor = '#3b82f6',
    recipientName,
    bodyHtml,
    ctaText,
    ctaUrl,
    footerNote = 'This is an automated notification from the Work Suite HRMS Enterprise System.',
  } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px; background-color:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #e4e4e7; box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          
          <!-- Header Banner with Circular Logo -->
          <tr>
            <td style="background-color:#09090b; padding: 28px 32px; text-align: center; border-bottom: 3px solid #27272a;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td style="vertical-align:middle; text-align:center;">
                    <!-- Circular Logo Emblem -->
                    <div style="width:68px; height:68px; border-radius:50%; background-color:#ffffff; border:2px solid #52525b; padding:2px; display:inline-block; box-shadow:0 2px 10px rgba(0,0,0,0.35); overflow:hidden;">
                      <img src="${WORKSUITE_LOGO_URL}" alt="Work Suite Logo" width="64" height="64" style="display:block; border-radius:50%; object-fit:contain;" />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:12px; text-align:center;">
                    <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:800; letter-spacing:-0.5px;">Work Suite HRMS</h1>
                    <p style="margin:4px 0 0 0; color:#a1a1aa; font-size:12px; font-weight:500; letter-spacing:0.5px;">Every workday, perfectly aligned.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${badgeText ? `
                <div style="margin-bottom: 16px;">
                  <span style="display:inline-block; padding: 5px 14px; background-color:${badgeColor}15; color:${badgeColor}; border:1px solid ${badgeColor}35; border-radius:9999px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
                    ${badgeText}
                  </span>
                </div>
              ` : ''}

              <h2 style="margin:0 0 16px 0; color:#18181b; font-size:20px; font-weight:800; line-height:1.3; letter-spacing:-0.4px;">${title}</h2>

              ${recipientName ? `
                <p style="margin:0 0 16px 0; color:#3f3f46; font-size:14px; font-weight:600;">
                  Hello ${recipientName},
                </p>
              ` : ''}

              <div style="color:#3f3f46; font-size:14px; line-height:1.6;">
                ${bodyHtml}
              </div>

              ${ctaText && ctaUrl ? `
                <div style="margin-top:28px; text-align:center;">
                  <a href="${ctaUrl}" style="display:inline-block; background-color:#09090b; color:#ffffff; font-size:13px; font-weight:700; text-decoration:none; padding:12px 28px; border-radius:12px; box-shadow:0 2px 6px rgba(0,0,0,0.15);">
                    ${ctaText} &rarr;
                  </a>
                </div>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa; padding: 20px 32px; border-top:1px solid #f4f4f5; text-align:center;">
              <p style="margin:0 0 6px 0; font-size:11px; color:#71717a; line-height:1.5;">
                ${footerNote}
              </p>
              <p style="margin:0; font-size:11px; font-weight:600; color:#a1a1aa;">
                &copy; ${new Date().getFullYear()} Work Suite HRMS Platform. All rights reserved.
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

// Fallback Nodemailer transporter for environments where SMTP port 587 is open
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const sendEmail = async (options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) => {
  const senderEmail = process.env.EMAIL_FROM || 'odoovsb@gmail.com';
  const senderName = 'Work Suite HRMS';

  // 1. Primary Method: Brevo HTTPS REST API (Port 443)
  if (process.env.BREVO_API_KEY) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: {
            name: senderName,
            email: senderEmail,
          },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html || `<p>${options.text || ''}</p>`,
          textContent: options.text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Brevo HTTPS API error response:', errorData);
        throw new Error(`Brevo API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { messageId?: string };
      console.log('📧 Email dispatched via Brevo HTTPS API (Port 443):', data.messageId);
      return { messageId: data.messageId };
    } catch (apiErr) {
      console.warn('⚠️ Brevo HTTPS API dispatch failed, trying SMTP fallback...', apiErr);
    }
  }

  // 2. Fallback Method: Standard SMTP via Nodemailer
  if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    try {
      const info = await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      console.log('📧 Email dispatched via SMTP fallback:', info.messageId);
      return info;
    } catch (smtpErr) {
      console.error('❌ SMTP fallback dispatch error:', smtpErr);
      return null;
    }
  }

  console.warn('⚠️ No email service credentials configured (BREVO_API_KEY or SMTP), skipping dispatch.');
  return null;
};

export default transporter;
