const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const dnsPromises = dns.promises;

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Fallback to system default
}

const COMMON_MAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'icloud.com',
  'protonmail.com',
  'proton.me',
  'aol.com',
  'zoho.com',
  'mail.com',
]);

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

    if (COMMON_MAIL_DOMAINS.has(domain)) {
      return true;
    }

    // Allow localhost or standard development testing domains if not in production
    if (process.env.NODE_ENV !== 'production' && (domain === 'example.com' || domain === 'test.com')) {
      return true;
    }

    const addresses = await dnsPromises.resolveMx(domain);
    return Array.isArray(addresses) && addresses.length > 0;
  } catch (error) {
    if (error.code === 'ENOTFOUND' || error.code === 'ENODATA') {
      return false;
    }
    return true;
  }
}

function getCleanAppPassword() {
  const raw = process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS || '';
  return raw.replace(/["'\s]/g, '');
}

/**
 * Nodemailer Transporter
 * Default: smtp.gmail.com:465 with 15s connection timeouts
 */
function createTransporter() {
  const user = (process.env.EMAIL_USER || 'safesafar.auth@gmail.com').trim();
  const pass = getCleanAppPassword();
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const isSecure = process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 15000,
    socketTimeout: 15000,
    greetingTimeout: 15000,
  });
}

/**
 * HTTPS-based Mail Delivery: Resend API (bypasses Render outbound SMTP blocking)
 */
async function sendViaResend({ to, html }) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('RESEND_API_KEY is not set');
    err.code = 'ENOKEY';
    throw err;
  }

  const fromAddress = process.env.EMAIL_FROM || 'SafeSafar <onboarding@resend.dev>';
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [to],
      subject: 'SafeSafar - Confirm your email',
      html,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data.message || `Resend error: ${resp.status}`);
    err.code = `RESEND_${resp.status}`;
    throw err;
  }
  return { success: true, messageId: data.id };
}

/**
 * HTTPS-based Mail Delivery: Brevo API (bypasses Render outbound SMTP blocking)
 */
async function sendViaBrevo({ to, name, html }) {
  const apiKey = (process.env.BREVO_API_KEY || '').trim();
  if (!apiKey) {
    const err = new Error('BREVO_API_KEY is not set');
    err.code = 'ENOKEY';
    throw err;
  }

  const senderEmail = (process.env.EMAIL_USER || 'safesafar.auth@gmail.com').trim();
  const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'SafeSafar Security', email: senderEmail },
      to: [{ email: to, name: name || 'SafeSafar User' }],
      subject: 'SafeSafar - Confirm your email',
      htmlContent: html,
    }),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error(data.message || `Brevo error: ${resp.status}`);
    err.code = `BREVO_${resp.status}`;
    throw err;
  }
  return { success: true, messageId: data.messageId };
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

  const provider = (process.env.MAIL_PROVIDER || '').toLowerCase() || (process.env.RESEND_API_KEY ? 'resend' : process.env.BREVO_API_KEY ? 'brevo' : 'gmail');
  const pass = getCleanAppPassword();

  if (provider === 'gmail' && !pass && !process.env.SMTP_HOST) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Mailer] EMAIL_APP_PASSWORD not configured. Instant dev verification link generated: ${verifyUrl}`);
      return { success: true, devLink: verifyUrl };
    }
    console.error(`[Mailer Error] EMAIL_APP_PASSWORD is not configured in production.`);
    return { success: false, error: 'Email service is not configured', errorCode: 'ENOCREDENTIALS' };
  }

  try {
    if (provider === 'resend') {
      const info = await sendViaResend({ to, html });
      console.log(`[Mailer:Resend] Verification email sent to ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, provider: 'resend' };
    }

    if (provider === 'brevo') {
      const info = await sendViaBrevo({ to, name, html });
      console.log(`[Mailer:Brevo] Verification email sent to ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')} (ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, provider: 'brevo' };
    }

    // Default: Gmail / SMTP
    const transporter = createTransporter();
    const senderEmail = (process.env.EMAIL_USER || 'safesafar.auth@gmail.com').trim();
    const mailOptions = {
      from: `"SafeSafar Security" <${senderEmail}>`,
      to,
      subject: 'SafeSafar - Confirm your email',
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer:SMTP] Verification email sent to ${to.replace(/(.{2})(.*)(@.*)/, '$1***$3')} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId, provider: 'gmail' };
  } catch (err) {
    const errorCode = err.code || 'EUNKNOWN';
    console.error(`[Mailer Error] Failed to send email to ${to} [${errorCode}]: ${err.message}`);
    return { success: false, error: err.message, errorCode };
  }
}

/**
 * Diagnostic live status check for /api/auth/debug/mail-status
 */
async function checkMailStatusLive() {
  const provider = (process.env.MAIL_PROVIDER || '').toLowerCase() || (process.env.RESEND_API_KEY ? 'resend' : process.env.BREVO_API_KEY ? 'brevo' : 'gmail');

  if (provider === 'resend') {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
      return { configured: false, verified: false, provider: 'resend', errorCode: 'ENOKEY', errorMessage: 'RESEND_API_KEY is not set.' };
    }
    try {
      const resp = await fetch('https://api.resend.com/api-keys', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!resp.ok) {
        const text = await resp.text();
        return { configured: true, verified: false, provider: 'resend', errorCode: `HTTP_${resp.status}`, errorMessage: text };
      }
      return { configured: true, verified: true, provider: 'resend' };
    } catch (err) {
      return { configured: true, verified: false, provider: 'resend', errorCode: err.code || 'ENETWORK', errorMessage: err.message };
    }
  }

  if (provider === 'brevo') {
    const apiKey = (process.env.BREVO_API_KEY || '').trim();
    if (!apiKey) {
      return { configured: false, verified: false, provider: 'brevo', errorCode: 'ENOKEY', errorMessage: 'BREVO_API_KEY is not set.' };
    }
    try {
      const resp = await fetch('https://api.brevo.com/v3/account', {
        headers: { 'api-key': apiKey },
      });
      if (!resp.ok) {
        const text = await resp.text();
        return { configured: true, verified: false, provider: 'brevo', errorCode: `HTTP_${resp.status}`, errorMessage: text };
      }
      return { configured: true, verified: true, provider: 'brevo' };
    } catch (err) {
      return { configured: true, verified: false, provider: 'brevo', errorCode: err.code || 'ENETWORK', errorMessage: err.message };
    }
  }

  // Gmail SMTP
  const user = (process.env.EMAIL_USER || '').trim();
  const pass = getCleanAppPassword();

  if (!user || !pass) {
    return {
      configured: false,
      verified: false,
      provider: 'gmail',
      errorCode: 'ENOCREDENTIALS',
      errorMessage: `EMAIL_USER or EMAIL_APP_PASSWORD is missing (user=${!!user}, pass=${!!pass}).`,
    };
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return {
      configured: true,
      verified: true,
      provider: 'gmail',
      user,
    };
  } catch (error) {
    const errorCode = error.code || 'EUNKNOWN';
    return {
      configured: true,
      verified: false,
      provider: 'gmail',
      errorCode,
      errorMessage: error.message,
    };
  }
}

/**
 * Verify transporter connectivity on server startup
 */
async function verifyMailerTransport() {
  const provider = (process.env.MAIL_PROVIDER || '').toLowerCase() || (process.env.RESEND_API_KEY ? 'resend' : process.env.BREVO_API_KEY ? 'brevo' : 'gmail');

  if (provider !== 'gmail') {
    console.log(`[Mailer] Mail provider set to HTTPS API: ${provider.toUpperCase()}`);
    return true;
  }

  const pass = getCleanAppPassword();
  if (!pass && !process.env.SMTP_HOST) {
    console.warn('[Mailer Warning] EMAIL_APP_PASSWORD is not set. SMTP emails will be simulated; dev verification links will be logged directly.');
    return false;
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('[Mailer] SMTP transport connection verified successfully.');
    return true;
  } catch (error) {
    console.error(`[Mailer Error] SMTP connection failed [${error.code || 'EUNKNOWN'}]: ${error.message}`);
    return false;
  }
}

module.exports = {
  validateEmailMx,
  sendVerificationEmail,
  createTransporter,
  verifyMailerTransport,
  checkMailStatusLive,
};
