"use client";

import { useEffect, useState } from "react";
import { UserSync } from "@/components/dashboard/UserSync";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { FileText, Users, ArrowRight, Plus, DollarSign, TrendingUp, Home, Receipt } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const quickActions = [
  {
    title: "New Agreement",
    description: "Create a new rent agreement",
    href: "/dashboard/agreements/new",
    icon: Plus,
  },
  {
    title: "View Agreements",
    description: "See all rent agreements",
    href: "/dashboard/agreements",
    icon: FileText,
  },
  {
    title: "Manage Tenants",
    description: "Add or edit tenants",
    href: "/dashboard/tenants",
    icon: Users,
  },
  {
    title: "Manage Landlords",
    description: "Add or edit landlords",
    href: "/dashboard/landlords",
    icon: Home,
  },
];

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalAgreements: 0,
    activeAgreements: 0,
    totalMonthlyRent: 0,
    totalDeposit: 0,
  });
  interface RecentAgreement {
    id: string;
    agreement_number: string;
    monthly_rent: number;
    status: string;
    tenant: { name: string } | null;
  }

  const [recentAgreements, setRecentAgreements] = useState<RecentAgreement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: agreements, error } = await supabase
        .from("rent_agreements")
        .select("id, agreement_number, status, monthly_rent, deposit_amount, start_date, tenants:tenant_id(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;

      const totalAgreements = agreements?.length || 0;
      const activeAgreements = agreements?.filter((agr) => agr.status === "active").length || 0;
      const totalMonthlyRent = agreements?.reduce((sum, agr) => sum + (agr.monthly_rent || 0), 0) || 0;
      const totalDeposit = agreements?.reduce((sum, agr) => sum + (agr.deposit_amount || 0), 0) || 0;

      setStats({
        totalAgreements,
        activeAgreements,
        totalMonthlyRent,
        totalDeposit,
      });

      // Transform agreements to match RecentAgreement interface
      const formattedAgreements: RecentAgreement[] = (agreements || []).map((agr: {
        id: string;
        agreement_number: string;
        status: string;
        monthly_rent: number;
        start_date: string;
        tenants?: { name: string }[] | { name: string } | null;
      }) => ({
        id: agr.id,
        agreement_number: agr.agreement_number,
        monthly_rent: agr.monthly_rent,
        status: agr.status,
        tenant: Array.isArray(agr.tenants) 
          ? (agr.tenants[0] || null)
          : (agr.tenants || null),
      }));

      setRecentAgreements(formattedAgreements);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <UserSync />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here&apos;s your rent agreement summary
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agreements</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAgreements}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Agreements</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeAgreements}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Monthly Rent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalMonthlyRent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Per month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalDeposit.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Security deposits</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with rent agreements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center justify-between rounded-lg border p-4 transition hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-slate-100 p-2">
                        <Icon className="h-5 w-5 text-slate-700" />
                      </div>
                      <div>
                        <p className="font-medium">{action.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Agreements</CardTitle>
              <CardDescription>
                Your latest rent agreements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading...
                </div>
              ) : recentAgreements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No agreements yet</p>
                  <p className="text-sm mt-2">
                    Create your first rent agreement to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAgreements.map((agreement) => (
                    <Link
                      key={agreement.id}
                      href={`/dashboard/agreements/${agreement.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-medium">{agreement.agreement_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {agreement.tenant?.name || "No tenant"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{agreement.monthly_rent.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground capitalize">{agreement.status}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
