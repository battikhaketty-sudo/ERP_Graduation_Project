/** Keeps an optional leading + and digits only (phone / mobile). */
export const sanitizePhoneInput = (value: string) => {
  const trimmed = value.trimStart();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
};

/** Digits only — national ID, employee number, etc. */
export const sanitizeDigitsOnly = (value: string) => value.replace(/\D/g, "");

/** Non-negative decimal — salary, hours, amounts. */
export const sanitizeDecimalInput = (value: string) => {
  let next = value.replace(/[^\d.]/g, "");
  const dotIndex = next.indexOf(".");
  if (dotIndex === -1) return next;
  const integer = next.slice(0, dotIndex);
  const fraction = next.slice(dotIndex + 1).replace(/\./g, "");
  return `${integer}.${fraction}`;
};

/** Positive integer string — counts, display order. */
export const sanitizeIntegerInput = (value: string) => sanitizeDigitsOnly(value);

/** Letters (incl. Arabic), spaces, hyphen, apostrophe — person / place names. */
export const sanitizeLettersAndSpaces = (value: string) =>
  value.replace(/[^\p{L}\p{M}\s'-]/gu, "");

export const sanitizeEmailInput = (value: string) => value.replace(/\s/g, "");

export const isValidPhone = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
};

export const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const isValidDecimal = (value: string | number | undefined | null) => {
  if (value === undefined || value === null || value === "") return true;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) && num >= 0;
};

export const isValidDigits = (value: string, minLength = 1, maxLength = 20) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= minLength && digits.length <= maxLength;
};

/** Maps common employee form field names to input sanitizers. */
export const sanitizeEmployeeField = (field: string, value: string) => {
  switch (field) {
    case "phone":
    case "workPhone":
      return sanitizePhoneInput(value);
    case "salary":
    case "wage":
      return sanitizeDecimalInput(value);
    case "idNumber":
      return sanitizeDigitsOnly(value);
    case "name":
    case "fullName":
    case "nationality":
      return sanitizeLettersAndSpaces(value);
    case "email":
      return sanitizeEmailInput(value);
    default:
      return value;
  }
};
