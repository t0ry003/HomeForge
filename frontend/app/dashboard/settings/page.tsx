"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { Loader2, Upload, User, Mail, Camera, Check, Shield, Lock, Key, Palette } from "lucide-react"
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
import { updateProfile, getAvatarUrl } from "@/lib/apiClient"
import { Badge } from "@/components/ui/badge"
import { useUser, ACCENT_COLORS } from "@/components/user-provider"

export default function SettingsPage() {
  const { user, setUser, isLoading: isUserLoading, logout, updateAccentColor, refreshUser } = useUser()
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    accent_color: "default",
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        username: user.username || "",
        password: "",
        confirmPassword: "",
        accent_color: user.profile?.accent_color || "default",
      })
      const avatarPath = user.profile?.avatar || user.avatar;
      if (avatarPath) {
        setAvatarPreview(getAvatarUrl(avatarPath))
      }
    }
  }, [user])

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

    // Password validation
    if (formData.password) {
       if (formData.password !== formData.confirmPassword) {
         toast.error("Passwords do not match")
         setIsLoading(false)
         return
       }
       const passwordRegex = /^(?=.*[A-Z]).{4,}$/;
       if (!passwordRegex.test(formData.password)) {
         toast.error("Invalid Password", {
           description: "Password must be at least 4 characters long and contain at least one uppercase letter.",
         })
         setIsLoading(false)
         return
       }
    }

    try {
      const updatedUser = await updateProfile({
        first_name: formData.first_name,
        last_name: formData.last_name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: user.profile?.role || user.role,
        accent_color: formData.accent_color,
        avatarFile: avatarFile || undefined,
      })
      
      // Check for critical changes
      const isCriticalChange = 
        (formData.username !== user.username) ||
        (formData.email !== user.email) ||
        (formData.password.length > 0);

      if (isCriticalChange) {
        toast.success("Profile updated. Please log in again.")
        setTimeout(() => {
          logout()
        }, 1500)
      } else {
        await refreshUser()
        
        // Clear password fields
        setFormData(prev => ({ ...prev, password: "", confirmPassword: "" }))
        
        toast.success("Profile updated successfully")
        setIsLoading(false)
      }
      
    } catch (error: any) {
      toast.error("Update failed", {
        description: error.message,
      })
      setIsLoading(false)
    }
  }

  if (isUserLoading || !user) {
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
                  <Badge variant="secondary" className="mt-1 uppercase">
                    {user.profile?.role || user.role || "User"}
                  </Badge>
                </div>
              </motion.div>

              {/* Form Fields */}
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <motion.div variants={itemVariants} className="space-y-2 text-center">
                    <Label htmlFor="first_name" className="flex items-center justify-center gap-2">
                      <User className="h-4 w-4" /> First Name
                    </Label>
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
                  
                  <motion.div variants={itemVariants} className="space-y-2 text-center">
                    <Label htmlFor="last_name" className="flex items-center justify-center gap-2">
                      <User className="h-4 w-4" /> Last Name
                    </Label>
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

                <motion.div variants={itemVariants} className="space-y-2 text-center">
                  <Label htmlFor="username" className="flex items-center justify-center gap-2">
                    <User className="h-4 w-4" /> Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="username" 
                      className="pl-9"
                      value={formData.username} 
                      onChange={(e) => setFormData({...formData, username: e.target.value})} 
                    />
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground ml-1">
                    Changing username will require re-login.
                  </p>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2 text-center">
                  <Label htmlFor="email" className="flex items-center justify-center gap-2">
                    <Mail className="h-4 w-4" /> Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      className="pl-9"
                      value={formData.email} 
                      onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground ml-1">
                    Changing email will require re-login.
                  </p>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2 text-center">
                  <Label className="flex items-center justify-center gap-2">
                    <Palette className="h-4 w-4" /> Accent Color
                  </Label>
                  <div className="flex flex-wrap gap-3 pt-2 justify-center">
                    {Object.entries(ACCENT_COLORS).map(([name, value]) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, accent_color: name })
                          updateAccentColor(name) // Preview immediately
                        }}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          formData.accent_color === name 
                            ? "border-primary ring-2 ring-primary ring-offset-2" 
                            : "border-transparent hover:scale-110"
                        }`}
                        style={{ backgroundColor: name === 'default' ? 'var(--foreground)' : value.replace('oklch(', 'oklch(').replace(')', ')') }}
                        title={name.charAt(0).toUpperCase() + name.slice(1)}
                      />
                    ))}
                  </div>
                </motion.div>

                <div className="space-y-4">
                  <motion.div variants={itemVariants} className="space-y-2 text-center">
                    <Label htmlFor="password" className="flex items-center justify-center gap-2">
                      <Key className="h-4 w-4" /> New Password (Optional)
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type="password"
                        className="pl-9"
                        placeholder="Leave blank to keep current"
                        value={formData.password} 
                        onChange={(e) => setFormData({...formData, password: e.target.value})} 
                      />
                    </div>
                    <p className="text-[0.8rem] text-muted-foreground ml-1">
                      Must contain 1 uppercase letter and be at least 4 characters long.
                    </p>
                  </motion.div>

                  {formData.password && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2 text-center"
                    >
                      <Label htmlFor="confirmPassword" className="flex items-center justify-center gap-2">
                        <Key className="h-4 w-4" /> Confirm Password
                      </Label>
                      <div className="relative">
                        <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="confirmPassword" 
                          type="password"
                          className="pl-9"
                          placeholder="Confirm new password"
                          value={formData.confirmPassword} 
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} 
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-center pb-8">
              <motion.div variants={itemVariants} className="w-full max-w-xs">
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20" 
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
