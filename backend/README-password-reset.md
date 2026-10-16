# Admin password reset email configuration

This feature adds one-time, 15-minute password reset links for existing `admin` and `editor` accounts. It does not change the existing login/JWT flow.

## 1. Database migration

Run `backend/migrations/20261016_create_password_reset_tokens.sql` against the same MySQL database configured for the API. The API does not attempt to create tables automatically.

## 2. SMTP environment

Add these variables to the backend environment file (never commit real credentials):

```dotenv
FRONTEND_URL=https://wureyes.link
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-sender@gmail.com
SMTP_PASS=your-16-character-google-app-password
SMTP_FROM="Wureyes Admin <your-sender@gmail.com>"
```

For Gmail, enable 2-Step Verification and create an App Password. Do not use your normal Google account password. Port 465 uses implicit TLS; port 587 can be used with STARTTLS by setting `SMTP_PORT=587`.

## 3. Install and restart backend after merge

From the backend directory run `npm install`, then restart the existing PM2 API process after the release is intentionally deployed. Do not put SMTP secrets in frontend variables or in Git.

## Security notes

- Forgot-password responses are generic to reduce account enumeration.
- Raw tokens are never stored in the database; only SHA-256 hashes are stored.
- Links expire after 15 minutes and can be used only once.
- Passwords must be 12–128 characters and are stored with bcrypt.
- Reset tokens for the user are invalidated after a successful reset.
