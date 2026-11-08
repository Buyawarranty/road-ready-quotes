import type { DealerJourneyCustomer } from '@/contexts/DealerJourneyContext';

export function createAssistedCustomer(channel: 'whatsapp' | 'email', note = ''): DealerJourneyCustomer {
  return {
    name: '', email: '', phone: '', address_line1: '', town: '', postcode: '',
    address_line2: `[Pending: Panda Protect to complete via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}]${note ? ` ${note}` : ''}`,
  };
}

export function isAssistedCustomer(customer: Pick<DealerJourneyCustomer, 'address_line2'>): boolean {
  return Boolean(customer.address_line2?.startsWith('[Pending: Panda Protect to complete via '));
}

export function canProceedToDealerPayment(customer: DealerJourneyCustomer): boolean {
  return isAssistedCustomer(customer) || Boolean(customer.name && customer.email && customer.phone && customer.postcode);
}