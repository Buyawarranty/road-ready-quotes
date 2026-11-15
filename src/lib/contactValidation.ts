// Shared UK contact checks for staff/dealer entry forms.
export function normaliseUkPhone(raw: string): string {
  let d = raw.replace(/[\s\-().]/g, '');
  if (d.startsWith('+44')) d = '0' + d.slice(3);
  else if (d.startsWith('0044')) d = '0' + d.slice(4);
  return d;
}

export function ukPhoneError(raw: string): string | null {
  if (!raw.trim()) return 'Enter a UK phone number';
  if (/[^0-9+\s\-().]/.test(raw)) return 'Use numbers only, e.g. 07700 900123';
  const d = normaliseUkPhone(raw);
  if (!/^0\d+$/.test(d)) return 'UK numbers start with 0 or +44';
  if (/^07/.test(d)) return d.length === 11 ? null : 'Mobile numbers have 11 digits, e.g. 07700 900123';
  if (/^0[1238]/.test(d)) return d.length === 10 || d.length === 11 ? null : 'Landlines have 10 or 11 digits, e.g. 020 7946 0123';
  return 'Enter a valid UK phone number';
}

export function emailError(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Enter an email address';
  return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) && !/\.\./.test(v) ? null : 'Enter a valid email, e.g. john@dealership.co.uk';
}

export function personNameError(raw: string, required = true): string | null {
  const v = raw.trim();
  if (!v) return required ? 'Enter a name' : null;
  if (!/^[A-Za-zÀ-ÿ' -]+$/.test(v)) return 'Letters, spaces, hyphens and apostrophes only';
  return v.replace(/[^A-Za-zÀ-ÿ]/g, '').length >= 2 ? null : 'Enter a full name, e.g. John Smith';
}

export function companyNameError(raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'Enter the dealership name';
  return v.length >= 2 ? null : 'Enter the full dealership name';
}
