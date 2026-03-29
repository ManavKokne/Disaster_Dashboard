"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Activity,
  LayoutDashboard,
  Map,
  BarChart3,
  Menu,
  X,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_TABS = [
  { label: "Summary", href: "/home", icon: LayoutDashboard },
  { label: "Map", href: "/home/map", icon: Map },
  { label: "Charts", href: "/home/charts", icon: BarChart3 },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDrawerOpen]);

  return (
    <>
      <nav className="w-full bg-white border-b border-slate-200 px-4 py-0 flex items-center justify-between h-11 shrink-0">
        <div className="flex items-center h-11">
          <img
            src="/potential_logo_1.png"
            alt="Disaster Dashboard"
            width="36"
            height="36"
            loading="eager"
            decoding="async"
            className="h-9 w-9 rounded-full border border-slate-200 object-contain bg-white"
          />
        </div>

        <div className="hidden lg:flex items-center gap-1 h-11">
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

        <div className="hidden lg:flex items-center gap-2">
          <Activity className="h-4 w-4 text-green-500" />
          <span className="text-xs text-slate-500">{user?.email}</span>
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

        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </nav>

      <div
        className={cn(
          "lg:hidden fixed inset-0 z-50 transition-opacity duration-300",
          isDrawerOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!isDrawerOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/30"
          aria-label="Close navigation menu"
          onClick={() => setIsDrawerOpen(false)}
        />

        <aside
          className={cn(
            "absolute top-0 right-0 h-screen w-[82vw] max-w-sm bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 ease-out flex flex-col",
            isDrawerOpen ? "translate-x-0" : "translate-x-full"
          )}
          aria-label="Navigation drawer"
        >
          <div className="h-11 px-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800">Navigation</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close navigation drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 py-3 border-b border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="truncate">{user?.email}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {NAV_TABS.map((tab) => {
              const isActive = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.href}
                  type="button"
                  onClick={() => router.push(tab.href)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-3 border-t border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full text-red-600 border-red-200 hover:bg-red-50 h-9"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Sign Out
            </Button>
          </div>
        </aside>
      </div>
    </>
  );
}
