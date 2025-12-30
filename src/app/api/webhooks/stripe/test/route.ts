import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Test endpoint to verify webhook is accessible
export async function GET() {
  return NextResponse.json({
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString(),
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Not set',
  });
}

// Test endpoint to manually trigger subscription creation (for testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, planType, planPrice } = body;

    if (!userId || !planType || !planPrice) {
      return NextResponse.json(
        { error: 'userId, planType, and planPrice are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    
    if (planType === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (planType === 'quarterly') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else if (planType === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Create subscription
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        plan_type: planType,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        price: parseFloat(planPrice),
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create subscription', details: error },
        { status: 500 }
      );
    }

    // Update user type
    await supabase
      .from('profiles')
      .update({ user_type: 'car_owner' })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      subscription: data,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

