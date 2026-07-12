"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCircle, Settings, Bell, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
        },
      },
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors p-1"
      >
        <UserCircle className="h-10 w-10 text-foreground/70" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-56 glass-panel rounded-2xl overflow-hidden z-50 flex flex-col p-2 space-y-1"
          >
            <Link 
              href="/dashboard/notifications" 
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-medium"
            >
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </Link>
            <Link 
              href="/dashboard/settings" 
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-medium"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
            <div className="h-px w-full bg-card-border my-1" />
            <button 
              onClick={() => { setIsOpen(false); handleLogout(); }}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-destructive transition-colors text-sm font-medium"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
