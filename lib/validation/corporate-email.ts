export const CORPORATE_EMAIL_ERROR =
  "Дозволено використання лише корпоративної пошти @e-nazk";

export function isCorporateEmail(email: string) {
  return /^[a-z0-9._%+-]+@e-nazk$/i.test(email.trim());
}
