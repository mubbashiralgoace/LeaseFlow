"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, Route, TrendingUp, Crown, AlertCircle } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardStats() {
  interface SubscriptionStatus {
    status: string;
    plan_type: string;
    end_date: string;
  }

  const [stats, setStats] = useState({
    activeRoutes: 0,
    routeMatches: 0,
    monthlySavings: 0,
    subscriptionStatus: null as SubscriptionStatus | null,
  });
  const [, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load subscription
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load active routes
      const { data: routes } = await supabase
        .from('car_owner_routes')
        .select('id')
        .eq('car_owner_id', user.id)
        .eq('is_active', true);

      // Load route requests
      const { data: requests } = await supabase
        .from('route_requests')
        .select('id, status')
        .eq('requester_id', user.id);

      setStats({
        activeRoutes: routes?.length || 0,
        routeMatches: requests?.filter(r => r.status === 'accepted').length || 0,
        monthlySavings: 0, // Can be calculated later
        subscriptionStatus: subscription,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const isSubscriptionActive = stats.subscriptionStatus && 
    stats.subscriptionStatus.status === 'active' && 
    new Date(stats.subscriptionStatus.end_date) > new Date();

  const statsData = [
    { 
      label: "Active Routes", 
      value: stats.activeRoutes.toString(), 
      delta: isSubscriptionActive ? "Your registered routes" : "Subscribe to register routes",
      icon: Car,
      color: "text-sky-600"
    },
    { 
      label: "Accepted Requests", 
      value: stats.routeMatches.toString(), 
      delta: "Requests you've accepted",
      icon: Route,
      color: "text-indigo-600"
    },
    { 
      label: "Monthly Savings", 
      value: `${stats.monthlySavings} PKR`, 
      delta: "Start carpooling to save",
      icon: TrendingUp,
      color: "text-green-600"
    },
  ];

  return (
    <>
      {!isSubscriptionActive && (
        <Card className="border-yellow-200 bg-yellow-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-900">Subscription Required</h3>
                  <p className="text-sm text-yellow-700">
                    Subscribe to register routes and start earning from carpooling
                  </p>
                </div>
              </div>
              <Link href="/dashboard/subscription">
                <Button variant="default" size="sm">
                  <Crown className="mr-2 h-4 w-4" />
                  Subscribe Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {isSubscriptionActive && (
        <Card className="border-green-200 bg-green-50 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">Active Subscription</h3>
                  <p className="text-sm text-green-700">
                    {stats.subscriptionStatus?.plan_type ? stats.subscriptionStatus.plan_type.charAt(0).toUpperCase() + stats.subscriptionStatus.plan_type.slice(1) : ''} Plan • 
                    Expires: {stats.subscriptionStatus?.end_date ? new Date(stats.subscriptionStatus.end_date).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {statsData.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {item.label}
                    </p>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-2xl font-semibold">
                        {item.value}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.delta}
                    </p>
                  </div>
                  <div className={`rounded-lg bg-slate-100 p-3 ${item.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

