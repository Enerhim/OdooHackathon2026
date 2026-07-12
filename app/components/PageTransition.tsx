"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export function PageTransition({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={className || "w-full h-full"}
    >
      {children}
    </motion.div>
  );
}
