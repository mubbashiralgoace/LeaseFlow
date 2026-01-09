"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Users, Plus, LogOut, User, Home, Wrench, Receipt, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserStore } from "@/store/useUserStore";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/agreements",
    label: "Rent Agreements",
    icon: FileText,
  },
  {
    href: "/dashboard/agreements/new",
    label: "New Agreement",
    icon: Plus,
  },
  {
    href: "/dashboard/tenants",
    label: "Tenants",
    icon: Users,
  },
  {
    href: "/dashboard/landlords",
    label: "Landlords",
    icon: Home,
  },
  {
    href: "/dashboard/payments",
    label: "Rent Payments",
    icon: Receipt,
  },
  {
    href: "/dashboard/maintenance",
    label: "Maintenance",
    icon: Wrench,
  },
  {
    href: "/dashboard/utilities",
    label: "Utility Bills",
    icon: Calculator,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, clear } = useUserStore();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      clear();
      router.push("/auth/signin");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to log out. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <aside className="hidden w-64 flex-col border-r bg-background md:flex">
      <div className="flex h-16 items-center px-6">
      <h1 className="mt-3 text-3xl font-semibold text-black">LeaseFlow</h1>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Button
                key={item.href}
                asChild
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
              >
                <Link href={item.href}>
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <Avatar>
            <AvatarImage src="" alt={user?.email || "User"} />
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium">
              {user?.email || "User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.id ? `ID: ${user.id.slice(0, 20)}...` : "Not logged in"}
            </p>
          </div>
        </div>
        <Separator className="my-3" />
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}

