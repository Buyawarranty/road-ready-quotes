export interface DealerSignupActivity {
  dealer_account_created: boolean;
  dealer_created_at: string | null;
  dealer_status: string | null;
  last_sign_in_at: string | null;
  quote_count: number;
  warranty_count: number;
  last_quote_at: string | null;
  last_warranty_at: string | null;
  last_activity_at: string | null;
}

export type DealerActivityStage = 'not_created' | 'login_not_used' | 'signed_up' | 'active';

export const DEALER_ACTIVITY_LABEL: Record<DealerActivityStage, string> = {
  not_created: 'Account not created',
  login_not_used: 'Awaiting first sign-in',
  signed_up: 'Signed up',
  active: 'Active user',
};

export function dealerActivityStage(activity: DealerSignupActivity, now = new Date()): DealerActivityStage {
  if (!activity.dealer_account_created) return 'not_created';
  const lastActivity = activity.last_activity_at ? new Date(activity.last_activity_at).getTime() : Number.NaN;
  if (Number.isFinite(lastActivity) && now.getTime() - lastActivity <= 30 * 24 * 60 * 60 * 1000) return 'active';
  if (activity.last_sign_in_at || activity.quote_count > 0 || activity.warranty_count > 0) return 'signed_up';
  return 'login_not_used';
}
