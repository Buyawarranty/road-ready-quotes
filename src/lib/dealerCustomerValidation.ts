import { z } from 'zod';

export const isUkPhone = (value: string) => /^(?:07\d{9}|447\d{9})$/.test(value.replace(/[\s()+-]/g, ''));

export const dealerCustomerSchema = z.object({
  name: z.string().trim().min(2, "Enter the customer's full name"),
  email: z.string().trim().email('Enter a valid email address'),
  phone: z.string().refine(isUkPhone, 'Enter a valid UK mobile number'),
  address_line1: z.string().trim().min(1, 'Enter address line 1'),
  address_line2: z.string().optional(),
  town: z.string().trim().min(1, 'Enter the town'),
  postcode: z.string().trim().min(1, 'Enter the postcode'),
});

export function dealerCustomerErrors(value: z.input<typeof dealerCustomerSchema>) {
  const result = dealerCustomerSchema.safeParse(value);
  const errors: Partial<Record<keyof z.input<typeof dealerCustomerSchema>, string>> = {};
  if (!result.success) for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof typeof errors;
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}