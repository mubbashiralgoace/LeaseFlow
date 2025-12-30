"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Check, Crown, Calendar, CreditCard } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  start_date: string;
  end_date: string;
  price: number;
}

const plans = [
  {
    id: "monthly",
    name: "Monthly Plan",
    price: 2000,
    duration: "1 month",
    description: "Perfect for trying out our platform",
    features: ["Register unlimited routes", "Set your own pricing", "Receive ride requests", "Manage your routes"],
  },
  {
    id: "quarterly",
    name: "Quarterly Plan",
    price: 5000,
    duration: "3 months",
    savings: "Save 17%",
    description: "Best value for regular car owners",
    features: ["Register unlimited routes", "Set your own pricing", "Receive ride requests", "Manage your routes", "Priority support"],
  },
  {
    id: "yearly",
    name: "Yearly Plan",
    price: 18000,
    duration: "12 months",
    savings: "Save 25%",
    description: "Maximum savings for committed car owners",
    features: ["Register unlimited routes", "Set your own pricing", "Receive ride requests", "Manage your routes", "Priority support", "Early access to new features"],
  },
];

export function SubscriptionPlans() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [, setUserProfile] = useState<{ vehicle_type?: string } | null>(null);
  const supabase = createSupabaseBrowserClient();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadData = async () => {
      await loadSubscription();
      await loadProfile();
    };
    
    loadData();
    
    // Check for payment success/cancel
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success) {
      toast({
        title: "Payment Successful!",
        description: "Your subscription has been activated. You can now register routes!",
      });
      loadData();
      // Clean URL
      router.replace('/dashboard/subscription');
    }
    
    if (canceled) {
      toast({
        variant: "destructive",
        description: "Payment was canceled. You can try again anytime.",
      });
      router.replace('/dashboard/subscription');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading subscription:", error);
      } else if (data) {
        setSubscription(data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading profile:", error);
      }

      if (data) {
        console.log("Profile loaded:", data);
        setUserProfile(data);
      } else {
        console.log("No profile found for user");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const handleSubscribe = async (planType: string) => {
    setLoading(prev => ({ ...prev, [planType]: true }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          description: "Please sign in to subscribe",
        });
        setLoading(prev => ({ ...prev, [planType]: false }));
        return;
      }

      // Reload profile to get latest data before checking
      const { data: freshProfile } = await supabase
        .from('profiles')
        .select('vehicle_type')
        .eq('id', user.id)
        .maybeSingle();

      console.log("Fresh profile check:", freshProfile);

      // Check if user has vehicle
      if (!freshProfile || (freshProfile.vehicle_type !== 'car' && freshProfile.vehicle_type !== 'bike')) {
        toast({
          variant: "destructive",
          title: "Vehicle Required",
          description: "You need to own a car or bike to subscribe. Please update your profile first.",
        });
        setLoading(prev => ({ ...prev, [planType]: false }));
        router.push("/dashboard/profile");
        return;
      }

      const plan = plans.find(p => p.id === planType);
      if (!plan) {
        setLoading(prev => ({ ...prev, [planType]: false }));
        return;
      }

      // Create Stripe checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: planType,
          planPrice: plan.price,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (!data.url) {
        throw new Error('No checkout URL received from server');
      }
      
      // Redirect to Stripe Checkout page
      window.location.href = data.url;

    } catch (error) {
      console.error("Error subscribing:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to process payment. Please try again.";
      toast({
        variant: "destructive",
        title: "Payment Failed",
        description: errorMessage,
      });
      setLoading(prev => ({ ...prev, [planType]: false }));
    }
  };

  const isSubscriptionActive = subscription && 
    subscription.status === 'active' && 
    new Date(subscription.end_date) > new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscription Plans</h1>
        <p className="text-muted-foreground mt-2">
          Subscribe to register routes and start earning from carpooling
        </p>
      </div>

      {isSubscriptionActive && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Active Subscription</h3>
                </div>
                <p className="text-sm text-green-700">
                  Plan: {subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)} • 
                  Expires: {new Date(subscription.end_date).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isPopular = plan.id === 'quarterly';
          return (
            <Card 
              key={plan.id} 
              className={`relative ${isPopular ? 'border-primary shadow-lg' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">PKR {plan.price.toLocaleString()}</span>
                    <span className="text-muted-foreground">/{plan.duration}</span>
                  </div>
                  {plan.savings && (
                    <Badge variant="secondary" className="mt-2">
                      {plan.savings}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isPopular ? "default" : "outline"}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading[plan.id] || !!isSubscriptionActive}
                >
                  {loading[plan.id] ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Processing...
                    </>
                  ) : isSubscriptionActive ? (
                    "Already Subscribed"
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Subscribe Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold">How it works</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Subscribe to any plan to become a car owner</li>
                <li>Register your routes with custom pricing</li>
                <li>Common users can send you ride requests</li>
                <li>Accept or reject requests as you prefer</li>
                <li>Set your own prices - no platform restrictions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

