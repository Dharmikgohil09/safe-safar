# 🔐 SafeSafar Authentication API Documentation

The SafeSafar Authentication subsystem provides secure, zero-trust token-based authentication designed for mobile personal safety, emergency SOS dispatch, and real-time guardian telemetry.

* **Base URL (Production)**: `https://safe-safar.onrender.com/api/auth`
* **Base URL (Local)**: `http://localhost:5000/api/auth`

---

## 1. User Signup
Creates a new pending user account, hashes the 4-digit numeric PIN using **bcrypt (cost 12)**, verifies that the email domain has valid **DNS MX records**, and sends a branded verification email with a 24-hour expiring token.

* **Method**: `POST`
* **Endpoint**: `/api/auth/signup`
* **Rate Limit**: 10 signups / hour per IP

### Request Headers
```http
Content-Type: application/json
```

### Request Body
```json
{
  "name": "Ananya Sharma",
  "email": "ananya.sharma@gmail.com",
  "phone": "+919876543210",
  "password": "1234"
}
```

### Response `201 Created`
```json
{
  "success": true,
  "message": "Account created! Please check your email to verify your account.",
  "email": "ananya.sharma@gmail.com",
  "requiresVerification": true
}
```

### Response `400 Bad Request`
```json
{
  "success": false,
  "field": "password",
  "error": "PIN must be exactly 4 digits."
}
```

> **Note on Pending Re-Signup**: If a user submits signup with an email that is still pending/unverified, their details and PIN are updated and a fresh verification email is resent without triggering a `409 Conflict`.

---

## 2. Verify Email (Web / Deep Link)
Validates the SHA-256 token from the email button, activates the account (`isEmailVerified = true`), and presents a styled HTML confirmation page with an **"Open SafeSafar App"** deep link button (`safesafar://verified`).

* **Method**: `GET`
* **Endpoint**: `/api/auth/verify-email?token=<rawToken>`

### Query Parameters
| Parameter | Type | Required | Description |
|:---|:---|:---|:---|
| `token` | `string` | Yes | 64-character hex verification token |

### Response `200 OK`
* Returns styled HTML success page with deep link button: `safesafar://verified`.

---

## 3. Check Verification Status (Mobile Polling)
Polled by the mobile app's "Check your email" screen every 4 seconds. Once the user clicks the verification link in their email, this endpoint returns their user profile and automatically issues their JWT tokens for instant auto-login.

* **Method**: `GET`
* **Endpoint**: `/api/auth/verification-status?email=user@example.com`

### Response `200 OK (Pending)`
```json
{
  "success": true,
  "verified": false
}
```

### Response `200 OK (Verified - Auto-Login)`
```json
{
  "success": true,
  "verified": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "id": "6719543...",
    "name": "Ananya Sharma",
    "email": "ananya.sharma@gmail.com",
    "phone": "9876543210",
    "avatar": "",
    "authProvider": "local"
  }
}
```

---

## 4. Resend Verification Email
Sends a new 24h verification link to an unverified email address. Enforces a 30-second cooldown in the mobile UI.

* **Method**: `POST`
* **Endpoint**: `/api/auth/resend-verification`
* **Rate Limit**: 3 requests / hour per IP

### Request Body
```json
{
  "email": "ananya.sharma@gmail.com"
}
```

### Response `200 OK`
```json
{
  "success": true,
  "message": "A fresh verification email has been sent. Please check your inbox."
}
```

---

## 5. User Login
Authenticates using either **email OR 10-digit mobile phone** and the **4-digit numeric PIN**.
* **Account Lockout**: After 5 consecutive failed attempts, the account is locked for 15 minutes.
* **Email Verification**: Rejects unverified accounts with code `EMAIL_NOT_VERIFIED`.

* **Method**: `POST`
* **Endpoint**: `/api/auth/login`
* **Rate Limit**: 5 attempts / minute per IP

### Request Body
```json
{
  "identifier": "9876543210",
  "password": "1234"
}
```
*(or with email: `"identifier": "ananya.sharma@gmail.com"`)*

### Response `200 OK`
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6719543...",
    "name": "Ananya Sharma",
    "email": "ananya.sharma@gmail.com",
    "phone": "9876543210",
    "avatar": "",
    "authProvider": "local"
  }
}
```

### Response `403 Forbidden (Unverified)`
```json
{
  "success": false,
  "code": "EMAIL_NOT_VERIFIED",
  "error": "Your email has not been verified yet. Please check your inbox.",
  "email": "ananya.sharma@gmail.com"
}
```

### Response `423 Locked (Lockout)`
```json
{
  "success": false,
  "error": "Account is temporarily locked due to 5 failed attempts. Please try again in 15 minute(s)."
}
```

---

## 6. Refresh Token Rotation
Rotates the 30-day refresh token and issues a new 15-minute access token. If a revoked refresh token is replayed, access is immediately blocked.

* **Method**: `POST`
* **Endpoint**: `/api/auth/refresh`

### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

### Response `200 OK`
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

---

## 7. Current User Profile
Retrieves the logged-in user profile on app startup.

* **Method**: `GET`
* **Endpoint**: `/api/auth/me`
* **Headers**: `Authorization: Bearer <accessToken>`

### Response `200 OK`
```json
{
  "success": true,
  "user": {
    "id": "6719543...",
    "name": "Ananya Sharma",
    "email": "ananya.sharma@gmail.com",
    "phone": "9876543210",
    "avatar": "",
    "authProvider": "local",
    "isEmailVerified": true
  }
}
```

---

## 8. Continue with Google
Exchanges and verifies Google `idToken` using Google's OAuth2 client. Creates a new user or links to an existing email account with `isEmailVerified = true`. If the mobile number is missing, `needsProfileCompletion = true` triggers the prompt for phone input.

* **Method**: `POST`
* **Endpoint**: `/api/auth/google`

### Request Body
```json
{
  "idToken": "<google_id_token>"
}
```

### Response `200 OK`
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "needsProfileCompletion": true,
  "user": {
    "id": "6719543...",
    "name": "Ananya Sharma",
    "email": "ananya.sharma@gmail.com",
    "phone": null,
    "avatar": "https://lh3.googleusercontent.com/...",
    "authProvider": "google"
  }
}
```

---

## 9. Complete Profile (Add Phone)
Adds an Indian 10-digit mobile number for users who authenticated via Google Sign-In.

* **Method**: `PATCH`
* **Endpoint**: `/api/auth/complete-profile`
* **Headers**: `Authorization: Bearer <accessToken>`

### Request Body
```json
{
  "phone": "+919876543210"
}
```

### Response `200 OK`
```json
{
  "success": true,
  "message": "Mobile number updated successfully.",
  "user": {
    "id": "6719543...",
    "name": "Ananya Sharma",
    "email": "ananya.sharma@gmail.com",
    "phone": "9876543210",
    "avatar": "",
    "authProvider": "google"
  }
}
```

---

## 10. Logout
Invalidates the refresh token in MongoDB Atlas and clears the local session.

* **Method**: `POST`
* **Endpoint**: `/api/auth/logout`

### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

### Response `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully."
}
```
