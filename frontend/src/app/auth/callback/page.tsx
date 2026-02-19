"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

function CallbackContent() {
  const { handleCallback } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("No authentication token received.");
      return;
    }

    handleCallback(token)
      .then(() => router.replace("/dashboard"))
      .catch(() => setError("Authentication failed. Please try again."));
  }, [searchParams, handleCallback, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <a
            href="/login"
            className="mt-4 inline-block text-sm text-gray-500 underline underline-offset-2 hover:text-blue-600 transition-colors duration-200"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <p className="text-sm text-gray-500">Signing you in...</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackContent />
    </Suspense>
  );
}
