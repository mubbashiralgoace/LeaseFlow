import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  start_date: string;
  end_date: string;
  price: number;
}

export interface SubscriptionStatus {
  isActive: boolean;
  subscription: Subscription | null;
  expiresAt: Date | null;
}

/**
 * Check if user has an active subscription
 */
export async function checkSubscriptionStatus(): Promise<SubscriptionStatus> {
  const supabase = createSupabaseBrowserClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {
        isActive: false,
        subscription: null,
        expiresAt: null,
      };
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !subscription) {
      return {
        isActive: false,
        subscription: null,
        expiresAt: null,
      };
    }

    const expiresAt = new Date(subscription.end_date);
    const isActive = 
      subscription.status === 'active' && 
      expiresAt > new Date();

    return {
      isActive,
      subscription,
      expiresAt,
    };
  } catch (error) {
    console.error('Error checking subscription:', error);
    return {
      isActive: false,
      subscription: null,
      expiresAt: null,
    };
  }
}

/**
 * Check if user can register routes (has active subscription)
 */
export async function canRegisterRoutes(): Promise<boolean> {
  const status = await checkSubscriptionStatus();
  return status.isActive;
}

