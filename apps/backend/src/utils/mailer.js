const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

// Cache the email template
let cachedTemplate = null;
function getEmailTemplate() {
  if (!cachedTemplate) {
    const templatePath = path.join(__dirname, '../templates/verifyEmail.html');
    cachedTemplate = fs.readFileSync(templatePath, 'utf8');
  }
  return cachedTemplate;
}

/**
 * Validate that an email domain has active MX records
 * Rejects nonexistent / fake domains
 */
async function validateEmailMx(email) {
  try {
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1].toLowerCase().trim();
    
    // Allow localhost or standard development testing domains if not in production
    if (process.env.NODE_ENV !== 'production' && (domain === 'example.com' || domain === 'test.com')) {
      return true;
    }

    const addresses = await dns.resolveMx(domain);
    return Array.isArray(addresses) && addresses.length > 0;
  } catch (error) {
    // dns error: ENOTFOUND, ENODATA, etc.
    return false;
  }
}

/**
 * Nodemailer Transporter
 * Default: Gmail SMTP (EMAIL_USER + EMAIL_APP_PASSWORD)
 * Easily swappable via SMTP_HOST/SMTP_PORT or Resend/Brevo
 */
function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS;

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: user || process.env.SMTP_USER,
        pass: pass || process.env.SMTP_PASS,
      },
    });
  }

  // Gmail SMTP default
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user || 'safesafar.auth@gmail.com',
      pass: pass || '',
    },
  });
}

/**
 * Send email verification link
 */
async function sendVerificationEmail({ to, name, rawToken }) {
  const backendUrl = (process.env.BACKEND_URL || 'https://safe-safar.onrender.com').replace(/\/+$/, '');
  const verifyUrl = `${backendUrl}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;

  const template = getEmailTemplate();
  const html = template
    .replace(/{{NAME}}/g, name || 'SafeSafar User')
    .replace(/{{VERIFY_URL}}/g, verifyUrl);

  const transporter = createTransporter();
  const senderEmail = process.env.EMAIL_USER || 'safesafar.auth@gmail.com';

  const mailOptions = {
    from: `"SafeSafar Security" <${senderEmail}>`,
    to,
    subject: 'SafeSafar - Confirm your email',
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Verification email sent to ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')} (Message ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Mailer] Error sending email to ${to}:`, err.message);
    // Don't crash signup if SMTP is temporarily down/unconfigured in dev
    return { success: false, error: err.message };
  }
}

module.exports = {
  validateEmailMx,
  sendVerificationEmail,
  createTransporter,
};
