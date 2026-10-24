const bcrypt = require('bcryptjs');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateVerificationToken,
  hashToken,
} = require('../utils/tokens');
const { validateEmailMx, sendVerificationEmail } = require('../utils/mailer');

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

/**
 * Normalize Indian phone numbers to 10 digits
 */
function normalizeIndianPhone(phone) {
  if (!phone) return null;
  const digits = phone.toString().replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('+91')) return digits.slice(3);
  return null;
}

/**
 * 1. SIGNUP
 * POST /api/auth/signup
 */
async function signup(req, res) {
  try {
    let { name, phone, email, password } = req.body;

    // 1. Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 50) {
      return res.status(400).json({
        success: false,
        field: 'name',
        error: 'Name must be between 2 and 50 characters.',
      });
    }
    name = name.trim();

    // 2. Validate email format
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        field: 'email',
        error: 'Valid email is required.',
      });
    }
    email = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        field: 'email',
        error: 'Please enter a valid email address.',
      });
    }

    // 3. Validate DNS MX records for email domain
    const hasValidMx = await validateEmailMx(email);
    if (!hasValidMx) {
      return res.status(400).json({
        success: false,
        field: 'email',
        error: 'Email domain is invalid or cannot receive mail.',
      });
    }

    // 4. Validate phone
    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        field: 'phone',
        error: 'Enter a valid 10-digit Indian mobile number.',
      });
    }

    // 5. Validate 4-digit PIN password
    const pinStr = (password || '').toString();
    if (!/^\d{4}$/.test(pinStr)) {
      return res.status(400).json({
        success: false,
        field: 'password',
        error: 'PIN must be exactly 4 digits.',
      });
    }

    // 6. Check existing user by email or phone
    const existingEmailUser = await User.findOne({ email }).select('+passwordHash');
    const existingPhoneUser = await User.findOne({ phone: normalizedPhone });

    // If verified user already exists with this email -> 409
    if (existingEmailUser && existingEmailUser.isEmailVerified) {
      return res.status(409).json({
        success: false,
        field: 'email',
        error: 'An account with this email already exists. Please log in.',
      });
    }

    // If phone taken by another verified user -> 409
    if (existingPhoneUser && existingPhoneUser.isEmailVerified && existingPhoneUser.email !== email) {
      return res.status(409).json({
        success: false,
        field: 'phone',
        error: 'An account with this mobile number already exists.',
      });
    }

    // Hash PIN with cost 12
    const passwordHash = await bcrypt.hash(pinStr, 12);

    // Generate random 32-byte token and its SHA-256 hash
    const rawVerificationToken = generateVerificationToken();
    const tokenHash = hashToken(rawVerificationToken);
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    let user;
    if (existingEmailUser && !existingEmailUser.isEmailVerified) {
      // Re-signup for unverified/pending user: update details and resend
      existingEmailUser.name = name;
      existingEmailUser.phone = normalizedPhone;
      existingEmailUser.passwordHash = passwordHash;
      existingEmailUser.emailVerificationTokenHash = tokenHash;
      existingEmailUser.emailVerificationExpires = tokenExpiry;
      await existingEmailUser.save();
      user = existingEmailUser;
    } else {
      // Create new pending user
      user = await User.create({
        name,
        email,
        phone: normalizedPhone,
        passwordHash,
        isEmailVerified: false,
        emailVerificationTokenHash: tokenHash,
        emailVerificationExpires: tokenExpiry,
      });
    }

    // Send verification email
    const mailResult = await sendVerificationEmail({
      to: email,
      name,
      rawToken: rawVerificationToken,
    });

    const emailSent = Boolean(mailResult && mailResult.success);

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Account created! Please check your email to verify your account.'
        : 'Account created, but could not send verification email. Please tap Resend in the app.',
      email,
      requiresVerification: true,
      emailSent,
      ...(mailResult && mailResult.errorCode ? { mailErrorCode: mailResult.errorCode } : {}),
      ...(mailResult && mailResult.error ? { mailError: mailResult.error } : {}),
      ...(mailResult && mailResult.devLink ? { devLink: mailResult.devLink } : {}),
    });
  } catch (err) {
    console.error('[Auth:Signup Error]', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during signup.',
    });
  }
}

/**
 * 2. VERIFY EMAIL (Browser Endpoint)
 * GET /api/auth/verify-email?token=...
 */
async function verifyEmail(req, res) {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).send(renderVerifyResultHtml({
        success: false,
        title: 'Invalid Link',
        message: 'The verification link is invalid or incomplete.',
      }));
    }

    const hashedToken = hashToken(token);
    const user = await User.findOne({
      emailVerificationTokenHash: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).send(renderVerifyResultHtml({
        success: false,
        title: 'Expired or Invalid Link',
        message: 'This email verification link is invalid or has expired (24h limit). Please request a new one from the app.',
      }));
    }

    // Set email verified and clear token
    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.status(200).send(renderVerifyResultHtml({
      success: true,
      title: 'Email Verified!',
      message: 'Your SafeSafar account has been activated. Return to the app to log in.',
    }));
  } catch (err) {
    console.error('[Auth:VerifyEmail Error]', err);
    return res.status(500).send(renderVerifyResultHtml({
      success: false,
      title: 'Server Error',
      message: 'Unable to verify email at this moment. Please try again later.',
    }));
  }
}

/**
 * 3. VERIFICATION STATUS (Polling from Mobile App)
 * GET /api/auth/verification-status?email=...
 */
async function getVerificationStatus(req, res) {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email parameter required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    if (!user.isEmailVerified) {
      return res.status(200).json({ success: true, verified: false });
    }

    // User is verified! Generate tokens for seamless auto-login
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token hash in DB
    const refreshHash = hashToken(refreshToken);
    user.refreshTokenHash = [refreshHash];
    await user.save();

    return res.status(200).json({
      success: true,
      verified: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    console.error('[Auth:VerificationStatus Error]', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/**
 * 4. RESEND VERIFICATION EMAIL
 * POST /api/auth/resend-verification
 */
async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, error: 'No account found with this email.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: 'This account is already verified. Please sign in.',
      });
    }

    const rawToken = generateVerificationToken();
    user.emailVerificationTokenHash = hashToken(rawToken);
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const mailResult = await sendVerificationEmail({
      to: user.email,
      name: user.name,
      rawToken,
    });

    const emailSent = Boolean(mailResult && mailResult.success);

    return res.status(200).json({
      success: true,
      message: emailSent
        ? 'A fresh verification email has been sent. Please check your inbox.'
        : 'Could not send verification email. Please tap Resend again in a few moments.',
      emailSent,
      ...(mailResult && mailResult.errorCode ? { mailErrorCode: mailResult.errorCode } : {}),
      ...(mailResult && mailResult.error ? { mailError: mailResult.error } : {}),
      ...(mailResult && mailResult.devLink ? { devLink: mailResult.devLink } : {}),
    });
  } catch (err) {
    console.error('[Auth:ResendVerification Error]', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/**
 * 5. LOGIN (Email OR Phone + 4-digit PIN)
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { identifier, password, phone } = req.body;
    const loginId = (identifier || phone || '').toString().trim();
    const pin = (password || '').toString();

    if (!loginId || !pin) {
      return res.status(400).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }

    // Determine whether identifier is phone or email
    const isEmail = loginId.includes('@');
    const query = isEmail
      ? { email: loginId.toLowerCase() }
      : { phone: normalizeIndianPhone(loginId) || loginId };

    const user = await User.findOne(query).select('+passwordHash +refreshTokenHash');

    // Generic error to prevent account enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }

    // Check account lockout (5 attempts -> 15 min lock)
    if (user.isLocked()) {
      const waitMinutes = Math.ceil((user.lockUntil - Date.now()) / (60 * 1000));
      return res.status(423).json({
        success: false,
        error: `Account is temporarily locked due to 5 failed attempts. Please try again in ${waitMinutes} minute(s).`,
      });
    }

    // Check email verification
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        error: 'Your email has not been verified yet. Please check your inbox.',
        email: user.email,
      });
    }

    // Google-only user without PIN
    if (!user.passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'This account was created with Google. Please use Continue with Google.',
      });
    }

    // Compare 4-digit PIN
    const isPinMatch = await bcrypt.compare(pin, user.passwordHash);
    if (!isPinMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.failedLoginAttempts = 0;
        await user.save();
        return res.status(423).json({
          success: false,
          error: 'Account locked for 15 minutes due to 5 consecutive failed attempts.',
        });
      }
      await user.save();
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials.',
      });
    }

    // Reset lockout counters on success
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store hashed refresh token
    const refreshHash = hashToken(refreshToken);
    user.refreshTokenHash = [refreshHash];
    await user.save();

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    console.error('[Auth:Login Error]', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/**
 * 6. REFRESH TOKEN ROTATION
 * POST /api/auth/refresh
 */
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token is required.' });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token.' });
    }

    const hashedIncoming = hashToken(refreshToken);
    const user = await User.findOne({
      _id: decoded.userId,
      refreshTokenHash: hashedIncoming,
    }).select('+refreshTokenHash');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Revoked refresh token.' });
    }

    // Rotate tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    const newRefreshHash = hashToken(newRefreshToken);

    user.refreshTokenHash = [newRefreshHash];
    await user.save();

    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (err) {
    console.error('[Auth:Refresh Error]', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/**
 * 7. LOGOUT
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const hashedIncoming = hashToken(refreshToken);
      await User.updateOne(
        { refreshTokenHash: hashedIncoming },
        { $pull: { refreshTokenHash: hashedIncoming } }
      );
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('[Auth:Logout Error]', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/**
 * 8. CURRENT USER PROFILE
 * GET /api/auth/me
 */
async function me(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        authProvider: user.authProvider,
        isEmailVerified: user.isEmailVerified,
      },
    });
  } catch (err) {
    console.error('[Auth:Me Error]', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/**
 * 9. CONTINUE WITH GOOGLE
 * POST /api/auth/google
 */
async function googleAuth(req, res) {
  try {
    const { idToken, nonce } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, error: 'Google ID token required.' });
    }

    let payload;
    try {
      const audience = [
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        process.env.GOOGLE_IOS_CLIENT_ID,
      ].filter(Boolean);

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: audience.length > 0 ? audience : undefined,
      });
      payload = ticket.getPayload();

      // Verify nonce if provided in browser flow
      if (nonce && payload && payload.nonce && payload.nonce !== nonce) {
        console.warn('[GoogleAuth] Nonce mismatch detected in token verification');
        return res.status(401).json({ success: false, error: 'Google authentication failed: nonce mismatch.' });
      }
    } catch (gErr) {
      // Fallback: verify via Google UserInfo endpoint (supports OAuth access tokens and web flow tokens)
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (userInfoRes.ok) {
          const uData = await userInfoRes.json();
          payload = {
            email: uData.email,
            name: uData.name,
            picture: uData.picture,
            sub: uData.sub,
          };
        } else {
          throw new Error('HTTP ' + userInfoRes.status);
        }
      } catch (uiErr) {
        console.warn('[GoogleAuth] Token verification failed:', gErr.message, uiErr.message);
        return res.status(401).json({ success: false, error: 'Google authentication failed: ' + gErr.message });
      }
    }

    const { email, name, picture, sub: googleId } = payload;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Google account missing email address.' });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      // Link Google ID if not present
      if (!user.googleId) user.googleId = googleId;
      if (!user.avatar && picture) user.avatar = picture;
      user.isEmailVerified = true; // Google already verified this email
      await user.save();
    } else {
      // Create user
      user = await User.create({
        name: name || 'Google User',
        email: email.toLowerCase().trim(),
        googleId,
        avatar: picture || '',
        authProvider: 'google',
        isEmailVerified: true,
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const refreshHash = hashToken(refreshToken);
    user.refreshTokenHash = [refreshHash];
    await user.save();

    const needsProfileCompletion = !user.phone;

    return res.status(200).json({
      success: true,
      accessToken,
      refreshToken,
      needsProfileCompletion,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        avatar: user.avatar,
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    console.error('[Auth:Google Error]', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/**
 * 10. COMPLETE PROFILE (Attach phone number for Google users)
 * PATCH /api/auth/complete-profile
 */
async function completeProfile(req, res) {
  try {
    const { phone } = req.body;
    const normalized = normalizeIndianPhone(phone);
    if (!normalized) {
      return res.status(400).json({
        success: false,
        error: 'Enter a valid 10-digit Indian mobile number.',
      });
    }

    const existing = await User.findOne({ phone: normalized, _id: { $ne: req.user.id } });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'This mobile number is already registered to another account.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { phone: normalized },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Mobile number updated successfully.',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        authProvider: user.authProvider,
      },
    });
  } catch (err) {
    console.error('[Auth:CompleteProfile Error]', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

/**
 * Render styled HTML page for email verification result
 */
function renderVerifyResultHtml({ success, title, message }) {
  const icon = success ? '✅' : '⚠️';
  const color = success ? '#10B981' : '#EF4444';
  const deepLink = 'safesafar://verified';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - SafeSafar</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0B0F19;
      color: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: #111827;
      border: 1px solid #1F2937;
      border-radius: 20px;
      padding: 40px 32px;
      max-width: 440px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .icon {
      font-size: 56px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      color: ${color};
      margin: 0 0 12px;
    }
    p {
      color: #94A3B8;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 28px;
    }
    .btn {
      display: inline-block;
      background: ${color};
      color: #FFFFFF !important;
      font-weight: 600;
      font-size: 16px;
      padding: 14px 32px;
      border-radius: 12px;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${deepLink}" class="btn">Open SafeSafar App</a>
    <div class="footer">SafeSafar — Safer Routes. Brighter Journeys.</div>
  </div>
</body>
</html>`;
}

function googleWebCallback(req, res) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SafeSafar - Google Sign-In</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0A192F; color: #FFFFFF; text-align: center; }
    .box { padding: 36px 24px; border-radius: 16px; background: #112240; box-shadow: 0 10px 30px rgba(0,0,0,0.4); max-width: 360px; width: 90%; }
    .spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.2); border-top-color: #10B981; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { font-size: 18px; margin: 0 0 8px; font-weight: 600; }
    p { font-size: 13px; color: #94A3B8; margin: 0 0 20px; line-height: 1.5; }
    .btn { display: inline-block; background: #10B981; color: #0A192F; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4); transition: transform 0.1s; cursor: pointer; }
    .btn:active { transform: scale(0.97); }
    .intent-link { display: block; margin-top: 14px; font-size: 12px; color: #64748B; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="box">
    <div id="spinner" class="spinner"></div>
    <h2 id="title">Connecting to SafeSafar...</h2>
    <p id="desc">Returning to app</p>
    <a id="btn" class="btn" style="display:none;" href="#">Open SafeSafar App</a>
    <a id="intentBtn" class="intent-link" style="display:none;" href="#">Open via Android Intent</a>
  </div>
  <script>
    (function() {
      function getTokens() {
        var hashStr = window.location.hash ? window.location.hash.substring(1) : '';
        var searchStr = window.location.search ? window.location.search.substring(1) : '';
        var hashParams = new URLSearchParams(hashStr);
        var searchParams = new URLSearchParams(searchStr);
        var idToken = hashParams.get('id_token') || searchParams.get('id_token') || hashParams.get('access_token') || searchParams.get('access_token');
        var error = hashParams.get('error') || searchParams.get('error') || hashParams.get('error_description') || searchParams.get('error_description');
        var state = hashParams.get('state') || searchParams.get('state');
        return { idToken: idToken, error: error, state: state };
      }

      var btn = document.getElementById('btn');
      var intentBtn = document.getElementById('intentBtn');
      var title = document.getElementById('title');
      var desc = document.getElementById('desc');
      var spinner = document.getElementById('spinner');

      function route(tokens) {
        var base = tokens.state ? decodeURIComponent(tokens.state) : 'safesafar://auth-callback';
        if (tokens.idToken) {
          var sep = (base.indexOf('#') !== -1 || base.indexOf('?') !== -1) ? '&' : '#';
          var finalUrl = base + sep + 'id_token=' + encodeURIComponent(tokens.idToken);
          var intentUrl = 'intent://auth-callback#id_token=' + encodeURIComponent(tokens.idToken) + '#Intent;scheme=safesafar;package=com.codecraft.safesafar;end;';

          btn.href = finalUrl;
          btn.style.display = 'inline-block';

          if (base.indexOf('safesafar://') === 0) {
            intentBtn.href = intentUrl;
            intentBtn.style.display = 'block';
          }

          if (title) title.textContent = 'Account Verified!';
          if (desc) desc.textContent = 'Returning to app... Tap the button below if SafeSafar did not open automatically.';

          // Automatic navigation
          window.location.href = finalUrl;
          return true;
        } else if (tokens.error) {
          if (spinner) spinner.style.display = 'none';
          if (title) { title.textContent = 'Sign-In Error'; title.style.color = '#EF4444'; }
          if (desc) desc.textContent = tokens.error;
          var errUrl = base + (base.indexOf('?') !== -1 ? '&' : '?') + 'error=' + encodeURIComponent(tokens.error);
          btn.href = errUrl;
          btn.textContent = 'Back to SafeSafar';
          btn.style.display = 'inline-block';
          window.location.href = errUrl;
          return true;
        }
        return false;
      }

      var info = getTokens();
      if (!route(info)) {
        setTimeout(function() {
          var retryInfo = getTokens();
          if (!route(retryInfo)) {
            btn.style.display = 'inline-block';
            btn.href = retryInfo.state ? decodeURIComponent(retryInfo.state) : 'safesafar://auth-callback';
            if (desc) desc.textContent = 'Tap below to return to SafeSafar.';
          }
        }, 300);
      }
    })();
  </script>
</body>
</html>`;

  return res.send(html);
}

module.exports = {
  signup,
  verifyEmail,
  getVerificationStatus,
  resendVerification,
  login,
  refresh,
  logout,
  me,
  googleAuth,
  googleWebCallback,
  completeProfile,
};
