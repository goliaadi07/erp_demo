# CRB Garment ERP — React + Secure Login Starter

This package keeps the supplied ERP interface intact and adds a React authentication shell, SQLite persistence for users/audit data, a dark-mode control, and backend endpoints prepared for OTP.

## Initial login
- Username: `admin`
- Password: `Threadline@123`

The password is stored as a bcrypt hash in SQLite, not plaintext.

## Requirements
- Node.js 20+ recommended
- npm

## Run locally
```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal (normally `http://127.0.0.1:5173`).

For a production-style local run:
```bash
npm run build
npm start
```
Then open `http://127.0.0.1:4000`.

## Database
SQLite is created automatically at `data/threadline.db` on first server start. It currently stores users, OTP request records, and authentication audit logs. The next phase can add ERP tables (employees, batches, assignments, payments, rate cards, etc.) without changing the login contract.

## OTP next phase
The API includes `/api/auth/request-otp` and `/api/auth/verify-otp` placeholders. Connect an SMS/email provider and add OTP expiry/rate limiting before enabling real OTP authentication.

## Security before deployment
Set a strong random `JWT_SECRET`, use HTTPS, add CSRF protection where applicable, add rate limiting/lockout for login and OTP endpoints, configure secure cookies if moving tokens out of sessionStorage, and keep the SQLite database outside any public static directory.


### Development URL
Open **http://127.0.0.1:5173/** in your browser. The API runs separately on port 4000. Do not open port 4000 for the ERP UI during development.
