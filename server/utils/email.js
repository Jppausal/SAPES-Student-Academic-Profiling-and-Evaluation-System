const nodemailer = require('nodemailer');

const createEmailTemplate = ({ code, recipient }) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SAPES Password Reset Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #073474; padding: 32px 36px; text-align: center; border-bottom: 3px solid #062a5d;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="font-size: 11px; font-weight: 700; color: #93c5fd; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px;">Bukidnon State University</div>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">SAPES Account Security</h1>
                    <div style="font-size: 12px; color: #cbd5e1; margin-top: 6px;">Student Academic Profiling &amp; Evaluation System</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">Password Reset Verification</h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                We received a request to reset the password for your SAPES account associated with <strong style="color: #0f172a;">${recipient}</strong>. Use the 6-digit verification code below to proceed:
              </p>

              <!-- Prominent Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                <tr>
                  <td align="center" style="background-color: #f8fafc; border: 2px dashed #073474; border-radius: 12px; padding: 26px 20px;">
                    <div style="font-size: 11px; font-weight: 700; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;">Your Verification Code</div>
                    <div style="font-family: 'SF Pro Mono', Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 40px; font-weight: 800; color: #073474; letter-spacing: 12px; line-height: 1.1; margin-bottom: 12px; padding-left: 12px;">
                      ${code}
                    </div>
                    <div style="display: inline-block; background-color: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 9999px; padding: 4px 14px; font-size: 11.5px; font-weight: 600;">
                      ⏱ Expires in 10 minutes
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Notice Box -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 14px 16px; margin: 24px 0 20px 0;">
                <p style="margin: 0; font-size: 12px; font-weight: 700; color: #1e40af;">Security Notice</p>
                <p style="margin: 4px 0 0 0; font-size: 12.5px; line-height: 1.5; color: #1e3a8a;">
                  If you did not request this verification code, you can safely ignore this email. Your current password remains secure, and no changes have been applied to your account.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #64748b;">
                <strong>Never share this code:</strong> BukSU faculty and IT staff will never ask for your verification code or password.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 36px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11.5px; color: #64748b; line-height: 1.5;">
                This is an automated security notification sent to <span style="color: #334155;">${recipient}</span>.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Bukidnon State University · College of Technologies<br>
                Fortich Street, Malaybalay City, Bukidnon 8700
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `BUKIDNON STATE UNIVERSITY
Student Academic Profiling & Evaluation System (SAPES)
======================================================

Hello,

A request was received to reset the password for your SAPES account (${recipient}).

YOUR VERIFICATION CODE:
========================================
${code}
========================================
(This code is valid for 10 minutes)

SECURITY NOTICE:
If you did not request this password reset, no action is required. Your account remains secure.
Never share this 6-digit verification code with anyone. BukSU faculty and administrators will never ask for your code.

--
Bukidnon State University · College of Technologies
Fortich St., Malaybalay City, Bukidnon 8700
Automated Security Notification - Please do not reply`;

  return { html, text };
};

const sendPasswordResetCode = async (recipient, code) => {
  await require('./systemSettings').requireIntegration('smtp');
  if (!process.env.SMTP_HOST || (!process.env.SMTP_FROM && !process.env.SMTP_USER)) {
    throw new Error('Email delivery is not configured');
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined
  });

  const senderName = (process.env.SMTP_FROM_NAME || 'BukSU SAPES Security').trim();
  const rawFrom = (process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();
  const fromHeader = rawFrom.includes('<') && rawFrom.includes('>')
    ? rawFrom
    : `"${senderName}" <${rawFrom}>`;

  const { html, text } = createEmailTemplate({ code, recipient });

  await transport.sendMail({
    from: fromHeader,
    to: recipient,
    subject: `[BukSU SAPES] ${code} is your verification code`,
    text,
    html
  });
};

module.exports = { sendPasswordResetCode };
