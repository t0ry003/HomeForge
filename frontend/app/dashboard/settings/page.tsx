"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { Loader2, Upload, User, Mail, Camera, Check, Shield } from "lucide-react"
import { motion } from "framer-motion"

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { fetchProfile, updateProfile, getAvatarUrl } from "@/lib/apiClient"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isReloading, setIsReloading] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await fetchProfile()
      setUser(data)
      setFormData({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        email: data.email || "",
      })
      const avatarPath = data.profile?.avatar || data.avatar;
      if (avatarPath) {
        setAvatarPreview(getAvatarUrl(avatarPath))
      }
    } catch (error) {
      console.error("Error loading profile:", error)
      toast.error("Failed to load profile")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const updatedUser = await updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: user.role,
        avatarFile: avatarFile || undefined,
      })
      
      setUser(updatedUser)
      
      const newAvatarPath = updatedUser.profile?.avatar || updatedUser.avatar;
      if (newAvatarPath) {
        setAvatarPreview(getAvatarUrl(newAvatarPath))
      }

      toast.success("Profile updated successfully")
      
      // Show reloading state and reload page to ensure all components (Sidebar etc) update
      setIsReloading(true)
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (error: any) {
      toast.error("Update failed", {
        description: error.message,
      })
      setIsLoading(false)
    }
  }

  if (isReloading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg font-medium text-muted-foreground">Updating profile...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  }

  return (
    <div className="flex min-h-full w-full items-center justify-center p-4 py-8">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="w-full max-w-2xl"
      >
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl font-bold">Profile Settings</CardTitle>
              <CardDescription>
                Manage your personal information and appearance
              </CardDescription>
            </motion.div>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-8 pb-10">
              {/* Avatar Section */}
              <motion.div 
                variants={itemVariants}
                className="flex flex-col items-center justify-center gap-4"
              >
                <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                  <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-background shadow-lg transition-transform duration-300 group-hover:scale-105">
                      <AvatarImage src={avatarPreview || ""} className="object-cover" />
                      <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                        {formData.first_name?.[0]}{formData.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Overlay for hover/loading */}
                    <div className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/40 transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {isLoading ? (
                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                      ) : (
                        <Camera className="h-8 w-8 text-white" />
                      )}
                    </div>
                  </div>
                  
                  <div className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg border-2 border-background transform translate-x-1 translate-y-1">
                    <Upload className="h-4 w-4" />
                  </div>
                </div>
                
                <Input 
                  ref={fileInputRef}
                  id="avatar" 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                
                <div className="text-center">
                  <p className="text-sm font-medium">{user.username}</p>
                  <Badge variant="secondary" className="mt-1">
                    {user.role || "User"}
                  </Badge>
                </div>
              </motion.div>

              {/* Form Fields */}
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="first_name" 
                        className="pl-9"
                        placeholder="John"
                        value={formData.first_name} 
                        onChange={(e) => setFormData({...formData, first_name: e.target.value})} 
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div variants={itemVariants} className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="last_name" 
                        className="pl-9"
                        placeholder="Doe"
                        value={formData.last_name} 
                        onChange={(e) => setFormData({...formData, last_name: e.target.value})} 
                      />
                    </div>
                  </motion.div>
                </div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      className="pl-9 bg-muted/50"
                      value={formData.email} 
                      disabled 
                    />
                    <div className="absolute right-3 top-2.5">
                      <Shield className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground ml-1">
                    Verified email address cannot be changed.
                  </p>
                </motion.div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-center pb-8">
              <motion.div variants={itemVariants} className="w-full max-w-xs">
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </motion.div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
