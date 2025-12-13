"use client"

import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { fetchProfile, logout as apiLogout } from "@/lib/apiClient"

// Define available accent colors (OKLCH values for --primary)
export const ACCENT_COLORS = {
  default: "oklch(0.205 0 0)", // Zinc-900 (Dark) / Zinc-50 (Light) - handled by theme
  violet: "oklch(0.5 0.2 280)",
  blue: "oklch(0.5 0.2 250)",
  green: "oklch(0.6 0.15 150)",
  orange: "oklch(0.6 0.15 50)",
  pink: "oklch(0.6 0.2 340)",
  cyan: "oklch(0.6 0.15 200)",
}

const UserContext = createContext({
  user: null,
  setUser: (user: any) => {},
  isLoading: true,
  logout: () => {},
  updateAccentColor: (color: string) => {},
  refreshUser: async () => {},
})

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Apply theme immediately before paint to avoid flash
  useLayoutEffect(() => {
    const storedColor = localStorage.getItem('homeforge_accent_color')
    if (storedColor) {
      applyAccentColor(storedColor)
    }
  }, [])

  const loadUser = async () => {
    try {
      // Try to load from local storage first to prevent flash
      const storedUser = localStorage.getItem('homeforge_user')
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        setUser(parsedUser)
        // Also ensure accent color is applied from stored user preference if available
        if (parsedUser.profile?.accent_color) {
          applyAccentColor(parsedUser.profile.accent_color)
        }
      }

      const data = await fetchProfile()
      setUser(data)
      localStorage.setItem('homeforge_user', JSON.stringify(data))
      
      if (data.profile?.accent_color) {
        applyAccentColor(data.profile.accent_color)
        localStorage.setItem('homeforge_accent_color', data.profile.accent_color)
      }
    } catch (error) {
      // If unauthorized and on a protected route, redirect
      // For now, we just don't set the user
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Don't fetch on public pages if you want to avoid 401s, 
    // but for now we'll try to fetch if we have a token or just let it fail silently
    loadUser()
  }, [])

  const applyAccentColor = (colorName: string) => {
    const root = document.documentElement
    const colorValue = ACCENT_COLORS[colorName as keyof typeof ACCENT_COLORS]
    
    if (colorValue) {
      root.style.setProperty("--primary", colorValue)
      // Also update ring color to match
      root.style.setProperty("--ring", colorValue)
    } else {
      root.style.removeProperty("--primary")
      root.style.removeProperty("--ring")
    }
  }

  const updateAccentColor = (color: string) => {
    applyAccentColor(color)
    localStorage.setItem('homeforge_accent_color', color)
    if (user) {
      const updatedUser = { ...user, profile: { ...user.profile, accent_color: color } }
      setUser(updatedUser)
      localStorage.setItem('homeforge_user', JSON.stringify(updatedUser))
    }
  }

  const logout = () => {
    apiLogout()
    setUser(null)
    localStorage.removeItem('homeforge_user')
    localStorage.removeItem('homeforge_accent_color')
    router.push("/login")
  }

  return (
    <UserContext.Provider value={{ user, setUser, isLoading, logout, updateAccentColor, refreshUser: loadUser }}>
      {children}
    </UserContext.Provider>
  )
}
