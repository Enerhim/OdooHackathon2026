"use client";

import { Search } from "lucide-react";
import { Input } from "./Input";
import { GlassCard } from "./GlassCard";

interface SearchFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}

export function SearchFilterBar({ search, onSearchChange, placeholder, children }: SearchFilterBarProps) {
  return (
    <GlassCard className="flex flex-col md:flex-row gap-4 p-4 mb-6 rounded-2xl items-center justify-between">
      <div className="relative w-full flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-foreground/40" />
        </div>
        <Input 
          className="pl-10 h-11 rounded-xl"
          placeholder={placeholder || "Search..."}
          value={search || ""}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      {children && (
        <div className="flex items-center gap-2 w-full md:w-auto">
          {children}
        </div>
      )}
    </GlassCard>
  );
}
