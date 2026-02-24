"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export function HeroSection() {
  const router = useRouter();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white"
    >
      <motion.div
        className="absolute inset-0 opacity-60"
        style={{
          background:
            "linear-gradient(to top, rgba(59, 130, 246, 0.6) 0%, rgba(34, 211, 238, 0.3) 40%, rgba(255, 255, 255, 0) 70%)",
        }}
        animate={{
          background: [
            "linear-gradient(to top, rgba(59, 130, 246, 0.6) 0%, rgba(34, 211, 238, 0.3) 40%, rgba(255, 255, 255, 0) 70%)",
            "linear-gradient(to top, rgba(34, 211, 238, 0.6) 0%, rgba(59, 130, 246, 0.3) 40%, rgba(255, 255, 255, 0) 70%)",
            "linear-gradient(to top, rgba(59, 130, 246, 0.6) 0%, rgba(34, 211, 238, 0.3) 40%, rgba(255, 255, 255, 0) 70%)",
          ],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        <motion.div className="mb-12 flex justify-center">
          <motion.img
            src="/fullLogo.png"
            alt="Promptr"
            className="h-14 sm:h-16"
            whileHover={{ scale: 1.05 }}
          />
        </motion.div>

        <motion.h1 className="text-6xl sm:text-7xl md:text-8xl mb-8 text-black">
          Build better, faster
        </motion.h1>

        <motion.p className="text-xl sm:text-2xl md:text-3xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Generate precise prompts to bring your app idea to life.
        </motion.p>

        <motion.div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <motion.button
            onClick={() => router.push("/login")}
            className="px-8 py-4 bg-black text-white rounded-full text-lg hover:bg-gray-800 transition-colors"
            whileHover={{ scale: 1.05 }}
          >
            Start Prompting →
          </motion.button>

          <motion.button
            onClick={() => scrollToSection("about")}
            className="px-8 py-4 bg-transparent border-2 border-gray-400 text-gray-700 rounded-full text-lg hover:border-gray-600 transition-colors"
            whileHover={{ scale: 1.05 }}
          >
            Learn more
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}
