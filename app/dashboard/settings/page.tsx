"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/app/components/ui/GlassCard";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { Mail, Loader2, Palette } from "lucide-react";
import { useTheme } from "@/app/components/ThemeProvider";
import { authClient } from "@/lib/auth-client";
import { updateEmail as updateEmailAction } from "./actions";

const THEMES = [
  { name: "Light", value: "light", colors: ["#f8fafc", "#3b82f6"] },
  { name: "Gruvbox", value: "gruvbox", colors: ["#282828", "#d65d0e"] },
  { name: "Catppuccin", value: "catppuccin", colors: ["#1e1e2e", "#cba6f7"] },
  { name: "Nord", value: "nord", colors: ["#2e3440", "#88c0d0"] },
  { name: "Everforest", value: "everforest", colors: ["#2b3339", "#a7c080"] },
] as const;

type Theme = typeof THEMES[number]["value"];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    
    const { success, error } = await updateEmailAction(email);
    
    if (!success) {
      setMessage(`Error: ${error}`);
    } else {
      setMessage("Email updated successfully.");
    }
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="space-y-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Account Information</h3>
          </div>
          
          <form onSubmit={handleUpdateEmail} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
                required
              />
            </div>
            <Button type="submit" disabled={loading || isPending}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Email
            </Button>
            {message && (
              <p className={`text-sm ${message.startsWith('Error') ? 'text-destructive' : 'text-success'}`}>
                {message}
              </p>
            )}
          </form>
        </GlassCard>

        <GlassCard className="space-y-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-semibold">Appearance</h3>
          </div>
          
          <div className="space-y-4">
            <label className="text-sm font-medium">Color Theme</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`flex flex-col items-start p-3 rounded-xl border transition-all ${
                    theme === t.value 
                      ? 'border-primary bg-primary/10 scale-95' 
                      : 'border-card-border hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: t.colors[0], borderColor: 'rgba(0,0,0,0.1)' }} />
                    <div className="w-4 h-4 rounded-full border shadow-sm" style={{ backgroundColor: t.colors[1], borderColor: 'rgba(0,0,0,0.1)' }} />
                  </div>
                  <span className="text-sm font-medium">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
