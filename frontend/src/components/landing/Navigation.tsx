"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface NavigationProps {
  variant?: "landing" | "dashboard";
  onLogout?: () => void;
}

export function Navigation({ variant = "landing", onLogout }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigateToSection = (id: string) => {
    if (isHome) {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      router.push(`/#${id}`);
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
        {variant === "dashboard" ? (
          <button onClick={() => router.push("/dashboard")}>
            <img src="/fullLogo.png" alt="Promptr" className="h-7 sm:h-8" />
          </button>
        ) : (
          <button onClick={() => navigateToSection("home")}>
            <img src="/fullLogo.png" alt="Promptr" className="h-7 sm:h-8" />
          </button>
        )}

        <div className="flex items-center gap-6">
          {variant === "landing" && (
            <>
              <button
                onClick={() => navigateToSection("home")}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Home
              </button>
              <button
                onClick={() => navigateToSection("about")}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                About
              </button>
            </>
          )}

          {variant === "landing" ? (
            !user ? (
              <>
                <button
                  onClick={() => router.push("/login")}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => router.push("/signup")}
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
            )
          ) : (
            user && (
              <>
                <span className="text-sm text-gray-600">{user.email}</span>
                <button
                  onClick={onLogout}
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Log out
                </button>
              </>
            )
          )}
        </div>
      </div>
    </motion.nav>
  );
}
