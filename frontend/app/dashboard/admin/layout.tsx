"use client"

import { useUser } from "@/components/user-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      // Check if user is logged in and has admin or owner role
      const role = user?.profile?.role || user?.role; // Fallback if data structure varies
      if (!user || (role !== 'admin' && role !== 'owner')) {
        router.push("/dashboard")
      }
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // If we assume user is authorized by here (or will be redirected)
  // We can render the children. The useEffect handles the redirect.
  // To prevent flash of content, we can double check here.
  const role = user?.profile?.role || user?.role;
  if (!user || (role !== 'admin' && role !== 'owner')) {
    return null; 
  }

  return (
    <div className="flex flex-col h-full space-y-6 p-8">
      {children}
    </div>
  )
}
