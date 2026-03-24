"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Activity, LayoutDashboard, Map, BarChart3, Menu, X } from "lucide-react";
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleNavigation = (href) => {
    router.push(href);
    setIsMenuOpen(false);
  };

  return (
    <nav className="w-full bg-white border-b border-slate-200 px-4 py-0 flex items-center justify-between h-11 shrink-0 relative">
      {/* Logo */}
      <div className="flex items-center h-11 min-w-fit">
        <span className="text-xl font-bold text-slate-900 tracking-tight">C</span>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden md:flex items-center gap-1 h-11 flex-1 justify-center">
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

      {/* Desktop Right Section */}
      <div className="hidden md:flex items-center gap-2">
        <Activity className="h-4 w-4 text-green-500" />
        <span className="text-xs text-slate-500">
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

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="md:hidden flex items-center h-11 ml-auto pr-2"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? (
          <X className="h-5 w-5 text-slate-700" />
        ) : (
          <Menu className="h-5 w-5 text-slate-700" />
        )}
      </button>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="absolute top-11 right-0 left-0 bg-white border-b border-slate-200 shadow-lg md:hidden z-50">
          <div className="flex flex-col p-3 gap-2">
            {/* User Info */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 pb-3">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-sm text-slate-700 break-all">{user?.email}</span>
            </div>

            {/* Navigation Items */}
            {NAV_TABS.map((tab) => {
              const isActive = pathname === tab.href;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.href}
                  onClick={() => handleNavigation(tab.href)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full",
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}

            {/* Divider */}
            <div className="border-t border-slate-200 my-2" />

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
