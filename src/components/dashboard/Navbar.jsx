"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Activity, LayoutDashboard, Map } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_TABS = [
  { label: "Summary", href: "/home", icon: LayoutDashboard },
  { label: "Map", href: "/home/map", icon: Map },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <nav className="w-full bg-white border-b border-slate-200 px-4 py-0 flex items-center flex-shrink-0 relative">
      {/* Left: Logo */}
      <div className="flex items-center h-11">
        <span className="text-xl font-bold text-slate-900 tracking-tight">C</span>
      </div>

      {/* Center: Tabs */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 h-11">
        {NAV_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-full text-sm font-medium border-b-2 transition-colors cursor-pointer",
                isActive
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Right: User info */}
      <div className="ml-auto flex items-center gap-2">
        {/* <Activity className="h-4 w-4 text-green-500" /> */}
        <span className="text-xs text-slate-500 hidden md:inline">
          {user?.email}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-red-600 border-red-200 hover:bg-red-50 ml-2 h-8"
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          Sign Out
        </Button>
      </div>
    </nav>
  );
}
