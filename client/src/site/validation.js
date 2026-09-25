// Mirrors the server-side rules in server/index.js (POST /api/quotes).
export const LIMITS = { firstName: 60, surname: 60, mobile: 20, email: 120, productId: 40 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^\+?[0-9\s\-().]{7,20}$/;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'\-]*$/u;

export function validateQuote(values) {
  const errors = {};
  const v = (k) => String(values[k] || '').trim();
  const required = {
    firstName: 'Please enter your first name',
    surname: 'Please enter your surname',
    mobile: 'Please enter your mobile number',
    email: 'Please enter your email address',
    productId: 'Please choose a product',
  };
  for (const k of Object.keys(required)) {
    if (!v(k)) errors[k] = required[k];
    else if (v(k).length > LIMITS[k]) errors[k] = `Must be at most ${LIMITS[k]} characters`;
  }
  if (!errors.firstName && !NAME_RE.test(v('firstName'))) errors.firstName = 'Please enter a valid first name';
  if (!errors.surname && !NAME_RE.test(v('surname'))) errors.surname = 'Please enter a valid surname';
  if (!errors.email && !EMAIL_RE.test(v('email'))) errors.email = 'Please enter a valid email address';
  if (!errors.mobile) {
    const digits = v('mobile').replace(/\D/g, '');
    if (!MOBILE_RE.test(v('mobile')) || digits.length < 7 || digits.length > 15) {
      errors.mobile = 'Enter a valid mobile number (7–15 digits, e.g. +91 98765 43210)';
    }
  }
  return errors;
}
