"use client";

import { motion } from "framer-motion";

export function AnimatedBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* Large blue-500 / cyan-400 blob */}
      <motion.div
        className="absolute h-[550px] w-[550px] rounded-full opacity-30 blur-3xl"
        style={{
          top: "5%",
          left: "10%",
          background:
            "radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(34, 211, 238, 0.3) 40%, transparent 70%)",
        }}
        animate={{
          x: [0, 30, -20, 10, -35, 25, -15, 40, -10, 0],
          y: [0, -25, 35, -15, 20, -30, 10, -20, 30, 0],
          scale: [1, 1.06, 0.95, 1.08, 0.97, 1.04, 0.96, 1.07, 0.98, 1],
          borderRadius: ["50%", "42% 58% 53% 47%", "55% 45% 47% 53%", "48% 52% 56% 44%", "53% 47% 44% 56%", "46% 54% 52% 48%", "51% 49% 46% 54%", "44% 56% 53% 47%", "57% 43% 48% 52%", "50%"],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Cyan-400 / blue-300 blob */}
      <motion.div
        className="absolute h-[400px] w-[400px] rounded-full opacity-25 blur-3xl"
        style={{
          top: "35%",
          right: "5%",
          background:
            "radial-gradient(circle, rgba(34, 211, 238, 0.5) 0%, rgba(147, 197, 253, 0.3) 45%, transparent 70%)",
        }}
        animate={{
          x: [0, -25, 15, -40, 20, -10, 35, -20, 10, 0],
          y: [0, 30, -20, 15, -35, 25, -10, 30, -25, 0],
          scale: [1, 0.96, 1.07, 0.94, 1.05, 0.97, 1.08, 0.95, 1.03, 1],
          borderRadius: ["50%", "54% 46% 43% 57%", "45% 55% 57% 43%", "56% 44% 48% 52%", "43% 57% 54% 46%", "52% 48% 45% 55%", "47% 53% 56% 44%", "55% 45% 42% 58%", "44% 56% 51% 49%", "50%"],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Blue-400 / cyan blob */}
      <motion.div
        className="absolute h-[350px] w-[350px] rounded-full opacity-20 blur-3xl"
        style={{
          bottom: "10%",
          left: "35%",
          background:
            "radial-gradient(circle, rgba(96, 165, 250, 0.5) 0%, rgba(34, 211, 238, 0.25) 50%, transparent 70%)",
        }}
        animate={{
          x: [0, 20, -35, 15, -25, 40, -10, 30, -20, 0],
          y: [0, -30, 15, -25, 35, -20, 25, -10, 20, 0],
          scale: [1, 1.05, 0.93, 1.09, 0.96, 1.04, 0.95, 1.07, 0.97, 1],
          borderRadius: ["50%", "53% 47% 55% 45%", "46% 54% 43% 57%", "57% 43% 52% 48%", "44% 56% 47% 53%", "51% 49% 55% 45%", "48% 52% 44% 56%", "55% 45% 51% 49%", "43% 57% 48% 52%", "50%"],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Small bright cyan-400 accent blob */}
      <motion.div
        className="absolute h-[250px] w-[250px] rounded-full opacity-20 blur-3xl"
        style={{
          top: "20%",
          right: "30%",
          background:
            "radial-gradient(circle, rgba(34, 211, 238, 0.5) 0%, rgba(59, 130, 246, 0.2) 50%, transparent 70%)",
        }}
        animate={{
          x: [0, -20, 30, -15, 25, -35, 10, -25, 20, 0],
          y: [0, 25, -15, 30, -20, 10, -30, 15, -25, 0],
          scale: [1, 1.07, 0.94, 1.05, 0.97, 1.08, 0.93, 1.06, 0.96, 1],
          borderRadius: ["50%", "47% 53% 56% 44%", "55% 45% 44% 56%", "43% 57% 51% 49%", "56% 44% 47% 53%", "49% 51% 55% 45%", "54% 46% 43% 57%", "45% 55% 52% 48%", "52% 48% 46% 54%", "50%"],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
