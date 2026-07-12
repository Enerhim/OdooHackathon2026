"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

export const GlassCard = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & HTMLMotionProps<"div">>(
  ({ className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "glass-panel rounded-2xl p-6",
          className
        )}
        {...props}
      />
    );
  }
);
GlassCard.displayName = "GlassCard";
