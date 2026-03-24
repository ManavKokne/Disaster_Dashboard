"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/home");
    } catch (err) {
      setError(
        err.code === "auth/invalid-credential"
          ? "Invalid email or password."
          : err.code === "auth/too-many-requests"
          ? "Too many attempts. Please try again later."
          : "Login failed. Please check your credentials."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <nav className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between">
        <span className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">C</span>
        <Button variant="outline" size="sm" className="text-blue-600 border-blue-600 text-xs sm:text-sm">
          Login
        </Button>
      </nav>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center pb-2 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl font-bold text-slate-900">
              Disaster Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {error && (
                <div className="flex items-start sm:items-center gap-2 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs sm:text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1 block">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="text-sm h-9 sm:h-10"
                />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1 block">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="text-sm h-9 sm:h-10"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-sm sm:text-base h-9 sm:h-10"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
