export interface DealerSignupDetails {
  dealership_name: string | null;
  contact_name: string | null;
  email_address: string;
  phone_number: string;
  monthly_vehicle_sales: string | null;
  current_warranty_provider: string | null;
  interested_in: string | null;
  heard_about_us: string | null;
  additional_information: string | null;
}

export type DealerSignupDetailsDraft = DealerSignupDetails;

export function dealerSignupDetailsDraft(details: DealerSignupDetails): DealerSignupDetailsDraft {
  return {
    dealership_name: details.dealership_name || '',
    contact_name: details.contact_name || '',
    email_address: details.email_address || '',
    phone_number: details.phone_number || '',
    monthly_vehicle_sales: details.monthly_vehicle_sales || '',
    current_warranty_provider: details.current_warranty_provider || '',
    interested_in: details.interested_in || '',
    heard_about_us: details.heard_about_us || '',
    additional_information: details.additional_information || '',
  };
}

export function validateDealerSignupDetails(draft: DealerSignupDetailsDraft) {
  const dealershipName = String(draft.dealership_name || '').trim();
  const email = String(draft.email_address || '').trim().toLowerCase();
  if (!dealershipName) return { error: 'Enter the dealership name.' } as const;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { error: 'Enter a valid email address.' } as const;

  const optional = (value: string | null) => String(value || '').trim() || null;
  return {
    payload: {
      dealership_name: dealershipName,
      contact_name: optional(draft.contact_name),
      email_address: email,
      phone_number: String(draft.phone_number || '').trim(),
      monthly_vehicle_sales: optional(draft.monthly_vehicle_sales),
      current_warranty_provider: optional(draft.current_warranty_provider),
      interested_in: optional(draft.interested_in),
      heard_about_us: optional(draft.heard_about_us),
      additional_information: optional(draft.additional_information),
    },
  } as const;
}
