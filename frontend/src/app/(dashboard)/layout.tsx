"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Navigation } from "@/components/landing/Navigation";
import { Footer } from "@/components/landing/Footer";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-3 text-center">
          <div className="skeleton mx-auto h-4 w-32" />
          <div className="skeleton mx-auto h-3 w-24" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navigation
        variant="dashboard"
        onLogout={logout}
      />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-6 pt-24 pb-10">{children}</main>
      <Footer />
    </div>
  );
}
