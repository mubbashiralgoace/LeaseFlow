import { UserSync } from "@/components/dashboard/UserSync";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Route, Users, ArrowRight, Calendar, Car } from "lucide-react";

const quickActions = [
  {
    title: "Find Routes",
    description: "Discover colleagues on your route",
    href: "/dashboard/find-routes",
    icon: Route,
  },
  {
    title: "Create Pool",
    description: "Set up your carpool",
    href: "/dashboard/create-pool",
    icon: Car,
  },
  {
    title: "View Schedule",
    description: "Check your carpool calendar",
    href: "/dashboard/schedule",
    icon: Calendar,
  },
];

export default function DashboardPage() {
  return (
    <>
      <UserSync />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here&apos;s your carpooling summary
          </p>
        </div>

        <DashboardStats />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Get started with carpooling
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
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest carpool updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No recent activity yet</p>
                <p className="text-sm mt-2">
                  Start by finding routes or creating a pool
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
