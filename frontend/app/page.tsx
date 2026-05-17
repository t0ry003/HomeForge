"use client"

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSystemStatus } from "@/lib/apiClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        const status = await getSystemStatus();
        if (status.is_fresh) {
          router.push("/setup");
          return;
        }
      } catch {
        // If status check fails, continue with normal flow
      }

      const token = localStorage.getItem("access");
      if (token) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
    redirect();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
