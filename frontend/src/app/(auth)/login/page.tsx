"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";
import { InteractiveGridBackground } from "@/components/ui/InteractiveGridBackground";

function LoginContent() {
  const { loginWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navigation />

      <div className="relative flex flex-1 overflow-hidden">
        {/* Animated cytoplasm blobs */}
        <div className="pointer-events-none absolute inset-0 z-0">
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
              x: [0, 150, -100, 120, -80, 60, -120, 0],
              y: [0, -100, 130, -70, 110, -50, 80, 0],
              scale: [1, 1.3, 0.75, 1.2, 0.8, 1.25, 0.85, 1],
              borderRadius: ["50%", "35% 65% 55% 45%", "60% 40% 35% 65%", "45% 55% 65% 35%", "65% 35% 45% 55%", "40% 60% 55% 45%", "55% 45% 35% 65%", "50%"],
            }}
            transition={{
              duration: 8,
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
              x: [0, -120, 80, -100, 60, -140, 90, 0],
              y: [0, 110, -80, 60, -120, 40, -90, 0],
              scale: [1, 0.8, 1.25, 0.85, 1.2, 0.75, 1.15, 1],
              borderRadius: ["50%", "55% 45% 40% 60%", "40% 60% 65% 35%", "60% 40% 45% 55%", "35% 65% 55% 45%", "65% 35% 40% 60%", "45% 55% 60% 40%", "50%"],
            }}
            transition={{
              duration: 7,
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
              x: [0, 100, -130, 70, -90, 110, -60, 0],
              y: [0, -80, 60, -110, 40, -70, 100, 0],
              scale: [1, 1.2, 0.8, 1.3, 0.75, 1.15, 0.9, 1],
              borderRadius: ["50%", "65% 35% 50% 50%", "35% 65% 45% 55%", "50% 50% 35% 65%", "45% 55% 65% 35%", "60% 40% 50% 50%", "40% 60% 45% 55%", "50%"],
            }}
            transition={{
              duration: 9,
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
              x: [0, -90, 120, -60, 100, -110, 70, 0],
              y: [0, 70, -100, 90, -60, 80, -110, 0],
              scale: [1, 1.25, 0.8, 1.15, 0.85, 1.3, 0.75, 1],
              borderRadius: ["50%", "40% 60% 60% 40%", "60% 40% 35% 65%", "50% 50% 60% 40%", "35% 65% 45% 55%", "55% 45% 40% 60%", "45% 55% 55% 45%", "50%"],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <InteractiveGridBackground />

        <div className="relative z-10 flex flex-1 items-center justify-center px-4 pt-16">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl text-gray-900 flex items-center gap-1.5">Sign in to <img src="/fullLogo.png" alt="Promptr" className="h-[2.75rem] inline-block relative top-[5px]" /></h1>
              <p className="mt-2 text-sm text-gray-500">
                Use your UC Davis Google account to continue
              </p>
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-600">{error}</p>
            )}

            <button
              onClick={loginWithGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>

            <p className="mt-6 text-center text-sm text-gray-400">
              Only @ucdavis.edu accounts and whitelisted emails are allowed.
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
