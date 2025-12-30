import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import Stripe from 'stripe';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Important: Disable body parsing for webhooks
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook received');
  
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ No stripe-signature header found');
    return NextResponse.json(
      { error: 'No signature found' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('✅ Webhook signature verified. Event type:', event.type);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Webhook signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  // Use admin client for webhooks (no user session needed)
  const supabase = createSupabaseAdminClient();

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('📝 Processing checkout.session.completed');
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log('Session mode:', session.mode);
        console.log('Session metadata:', session.metadata);
        console.log('Client reference ID:', session.client_reference_id);
        
        if (session.mode === 'subscription') {
          const userId = session.client_reference_id || session.metadata?.userId;
          const planType = session.metadata?.planType || 'monthly';
          const planPrice = parseFloat(session.metadata?.planPrice || '0');

          console.log('User ID:', userId);
          console.log('Plan Type:', planType);
          console.log('Plan Price:', planPrice);

          if (!userId) {
            console.error('❌ No user ID in session');
            return NextResponse.json(
              { error: 'No user ID found in session' },
              { status: 400 }
            );
          }

          // Calculate end date based on plan type
          const startDate = new Date();
          const endDate = new Date();
          
          if (planType === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
          } else if (planType === 'quarterly') {
            endDate.setMonth(endDate.getMonth() + 3);
          } else if (planType === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }

          console.log('Creating subscription:', {
            user_id: userId,
            plan_type: planType,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            price: planPrice,
          });

          // First, check if user exists in profiles table
          const { data: existingProfile, error: profileCheckError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();

          if (profileCheckError) {
            console.error('❌ Error checking profile:', profileCheckError);
          }

          if (!existingProfile) {
            console.log('⚠️ Profile not found, creating basic profile...');
            // Create a basic profile if it doesn't exist
            const { error: createProfileError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                user_type: 'common_user',
              });

            if (createProfileError) {
              console.error('❌ Error creating profile:', createProfileError);
            }
          }

          // Check if subscription already exists
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          let subscriptionData;
          let subError;

          if (existingSub) {
            // Update existing subscription
            console.log('📝 Updating existing subscription...');
            const { data, error } = await supabase
              .from('subscriptions')
              .update({
                plan_type: planType,
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                price: planPrice,
              })
              .eq('user_id', userId)
              .select()
              .single();

            subscriptionData = data;
            subError = error;
          } else {
            // Insert new subscription
            console.log('📝 Creating new subscription...');
            const { data, error } = await supabase
              .from('subscriptions')
              .insert({
                user_id: userId,
                plan_type: planType,
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                price: planPrice,
              })
              .select()
              .single();

            subscriptionData = data;
            subError = error;
          }

          if (subError) {
            console.error('❌ Error updating subscription:', subError);
            console.error('Error details:', JSON.stringify(subError, null, 2));
            return NextResponse.json(
              { error: 'Failed to update subscription', details: subError.message, code: subError.code },
              { status: 500 }
            );
          }

          console.log('✅ Subscription created/updated:', subscriptionData);

          // Update user type to car_owner
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ user_type: 'car_owner' })
            .eq('id', userId);

          if (profileError) {
            console.error('⚠️ Error updating user profile:', profileError);
          } else {
            console.log('✅ User type updated to car_owner');
          }
        } else {
          console.log('⚠️ Session mode is not subscription, skipping');
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) break;

        if (subscription.status === 'active' || subscription.status === 'trialing') {
          // Subscription is active - retrieve full subscription object to get period dates
          const fullSubscription = await stripe.subscriptions.retrieve(subscription.id) as unknown as Stripe.Subscription & {
            current_period_start: number;
            current_period_end: number;
          };
          const startDate = fullSubscription.current_period_start 
            ? new Date(fullSubscription.current_period_start * 1000)
            : new Date();
          const endDate = fullSubscription.current_period_end
            ? new Date(fullSubscription.current_period_end * 1000)
            : new Date();

          await supabase
            .from('subscriptions')
            .upsert({
              user_id: userId,
              plan_type: fullSubscription.items.data[0]?.price.recurring?.interval || 'monthly',
              status: 'active',
              start_date: startDate.toISOString(),
              end_date: endDate.toISOString(),
              price: (fullSubscription.items.data[0]?.price.unit_amount || 0) / 100,
            }, {
              onConflict: 'user_id'
            });
        } else {
          // Subscription cancelled or expired
          await supabase
            .from('subscriptions')
            .update({ status: 'expired' })
            .eq('user_id', userId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id || null;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as Stripe.Subscription & {
            current_period_start: number;
            current_period_end: number;
          };
          const userId = subscription.metadata?.userId;

          if (userId) {
            const startDate = subscription.current_period_start
              ? new Date(subscription.current_period_start * 1000)
              : new Date();
            const endDate = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000)
              : new Date();

            await supabase
              .from('subscriptions')
              .upsert({
                user_id: userId,
                plan_type: subscription.items.data[0]?.price.recurring?.interval || 'monthly',
                status: 'active',
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
                price: (subscription.items.data[0]?.price.unit_amount || 0) / 100,
              }, {
                onConflict: 'user_id'
              });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subscriptionId = typeof invoice.subscription === 'string' 
          ? invoice.subscription 
          : invoice.subscription?.id || null;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription;
          const userId = subscription.metadata?.userId;

          if (userId) {
            await supabase
              .from('subscriptions')
              .update({ status: 'expired' })
              .eq('user_id', userId);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    console.log('✅ Webhook processed successfully');
    return NextResponse.json({ received: true, eventType: event.type });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    if (errorStack) {
      console.error('Error stack:', errorStack);
    }
    return NextResponse.json(
      { error: 'Webhook handler failed', message: errorMessage },
      { status: 500 }
    );
  }
}

