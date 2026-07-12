"use client";

import { useState, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";

export interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={cn("w-full flex flex-col space-y-4", className)}>
      <GlassCard className="flex p-1 space-x-1 overflow-x-auto rounded-2xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 whitespace-nowrap flex-1 md:flex-none",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-foreground/70 hover:text-foreground hover:bg-white/10 dark:hover:bg-black/10"
            )}
          >
            {tab.label}
          </button>
        ))}
      </GlassCard>
      <div className="mt-4 transition-opacity duration-300">
        {tabs.find((t) => t.id === activeTab)?.content}
      </div>
    </div>
  );
}
