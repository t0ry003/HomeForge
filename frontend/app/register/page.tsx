"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ModeToggle } from "@/components/mode-toggle"
import { registerUser } from "@/lib/apiClient"

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Password complexity check
    // Must include a Capital letter and have at least 4 characters
    const passwordRegex = /^(?=.*[A-Z]).{4,}$/;
    if (!passwordRegex.test(formData.password)) {
      toast.error("Invalid Password", {
        description: "Password must be at least 4 characters long and contain at least one uppercase letter.",
      })
      setIsLoading(false)
      return
    }

    try {
      await registerUser(formData)
      toast.success("Account created!", {
        description: "You can now log in with your credentials.",
      })
      router.push("/login")
    } catch (error: any) {
      toast.error("Registration failed", {
        description: error.message || "Please try again later.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value })
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-50/50 dark:bg-zinc-950/50 py-10">
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>
      
      <div className="w-full max-w-md px-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tighter text-primary">HomeForge</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        <Card className="border-zinc-200/60 bg-white/50 shadow-xl backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-950/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Sign up</CardTitle>
            <CardDescription>
              Enter your information to create an account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4 pb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first_name">First name</Label>
                  <Input id="first_name" placeholder="John" required onChange={handleChange} disabled={isLoading} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input id="last_name" placeholder="Doe" required onChange={handleChange} disabled={isLoading} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="johndoe" required onChange={handleChange} disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" required onChange={handleChange} disabled={isLoading} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required onChange={handleChange} disabled={isLoading} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create account
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
}
