"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { ChatErrorBoundary } from "./ChatErrorBoundary";
import { ChatWindow } from "./ChatWindow";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18 }}
          >
            <ChatErrorBoundary onReset={() => setInstanceKey((current) => current + 1)}>
              <ChatWindow key={instanceKey} onClose={() => setOpen(false)} />
            </ChatErrorBoundary>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="bg-accent text-accent-foreground glow-border-strong relative inline-flex h-14 w-14 items-center justify-center rounded-full"
      >
        <span
          aria-hidden
          className="animate-portal-pulse border-accent absolute inset-0 rounded-full border-2"
        />
        <MessageCircle className="h-6 w-6" />
      </motion.button>
    </div>
  );
}
