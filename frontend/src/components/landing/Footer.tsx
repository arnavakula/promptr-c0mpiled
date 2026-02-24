"use client";

import { motion } from "framer-motion";
import { Linkedin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black text-white py-12 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.img
            src="/Logo.png"
            alt="Promptr"
            className="h-10 brightness-0 invert"
          />
          <span className="text-sm text-gray-400">
            &copy; 2026 Promptr. All rights reserved.
          </span>
        </div>

        <motion.a
          href="https://www.linkedin.com/in/promptr-promptr-39a8b63ab/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
        >
          <Linkedin className="w-6 h-6" />
        </motion.a>
      </div>
    </footer>
  );
}
