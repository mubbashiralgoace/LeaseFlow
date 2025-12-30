import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { planType, planPrice } = body;

    if (!planType || !planPrice) {
      return NextResponse.json(
        { error: 'Plan type and price are required' },
        { status: 400 }
      );
    }

    // Validate plan types
    const validPlans = ['monthly', 'quarterly', 'yearly'];
    if (!validPlans.includes(planType)) {
      return NextResponse.json(
        { error: 'Invalid plan type' },
        { status: 400 }
      );
    }

    // Create checkout session
    // Note: Stripe doesn't support PKR directly, using USD
    // You can convert PKR to USD or use a supported currency
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd', // Using USD as Stripe doesn't support PKR
            product_data: {
              name: `${planType.charAt(0).toUpperCase() + planType.slice(1)} Subscription Plan`,
              description: `Carpool platform subscription - ${planType} plan (PKR ${planPrice})`,
            },
            // Convert PKR to USD (approximate rate, you should use real-time conversion)
            // 1 USD ≈ 280 PKR (adjust this rate as needed)
            unit_amount: Math.round((planPrice / 280) * 100), // Convert PKR to USD cents
            recurring: planType === 'monthly' 
              ? { interval: 'month' }
              : planType === 'quarterly'
              ? { interval: 'month', interval_count: 3 }
              : { interval: 'year' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${request.nextUrl.origin}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/dashboard/subscription?canceled=true`,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        planType: planType,
        planPrice: planPrice.toString(),
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

