"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GlassCard } from "@/app/components/ui/GlassCard";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { Mail, Lock, LogIn, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await signIn.email({ email, password });
      if (error) {
        setError(error.message || "Failed to login");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">AssetFlow</h1>
        <p className="text-foreground/70">Sign in to your account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">{error}</div>}
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-5 w-5 text-foreground/50 z-10 pointer-events-none" />
            <Input 
              type="email" 
              placeholder="name@company.com" 
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Password</label>
            <Link href="#" className="text-sm text-primary hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-5 w-5 text-foreground/50 z-10 pointer-events-none" />
            <Input 
              type="password" 
              placeholder="••••••••" 
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <div className="text-center text-sm flex flex-col space-y-2">
        <p className="text-foreground/70">
          New here?{" "}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create Account
          </Link>
        </p>
        <p className="text-xs text-foreground/50">
          Sign up creates an employee account.<br/>Admin roles are assigned later.
        </p>
      </div>
    </GlassCard>
  );
}
