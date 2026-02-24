"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export function Navigation() {
  const router = useRouter();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-lg shadow-sm"
          : "bg-white/70 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={() => scrollToSection("home")}>
          <img src="/fullLogo.png" alt="Promptr" className="h-7 sm:h-8" />
        </button>

        <div className="flex items-center gap-6">
          <button
            onClick={() => scrollToSection("home")}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Home
          </button>
          <button
            onClick={() => scrollToSection("about")}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            About
          </button>

          {!user ? (
            <>
              <button
                onClick={() => router.push("/login")}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => router.push("/login")}
                className="px-6 py-2 bg-black text-white rounded-full text-sm hover:bg-gray-800 transition-colors"
              >
                Sign Up
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push("/dashboard")}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {user.email}
            </button>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
