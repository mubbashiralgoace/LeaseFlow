"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/profile": "Profile",
  "/dashboard/find-routes": "Find Routes",
  "/dashboard/create-pool": "Create Pool",
  "/dashboard/my-pools": "My Pools",
  "/dashboard/join-requests": "Join Requests",
  "/dashboard/calculator": "Cost Calculator",
  "/dashboard/schedule": "Schedule",
  "/dashboard/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || "Dashboard";

  return (
    <header className="flex h-16 items-center border-b px-4 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
    </header>
  );
}

