import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

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
  // This bypasses Render's outbound SMTP port 587 block completely
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
