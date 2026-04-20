"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Mail, Phone, User, Loader2, Lock, ArrowLeft, CheckCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"

// Format phone number with country code
function formatPhoneWithCountryCode(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '')
  
  // Malaysia detection
  // Mobile: 01x-xxx xxxx (010, 011, 012, 013, 014, 015, 016, 017, 018, 019)
  if (cleaned.startsWith('01') && cleaned.length >= 9 && cleaned.length <= 11) {
    return '+60' + cleaned.substring(1) // Remove leading 0, add +60
  }
  
  // Already has country code (60...)
  if (cleaned.startsWith('60') && cleaned.length >= 10) {
    return '+' + cleaned
  }
  
  // Already has + prefix
  if (phone.startsWith('+')) {
    return phone.replace(/[^\d+]/g, '')
  }
  
  // Singapore (starts with 8 or 9, 8 digits)
  if ((cleaned.startsWith('8') || cleaned.startsWith('9')) && cleaned.length === 8) {
    return '+65' + cleaned
  }
  
  // Default: assume Malaysia if starts with 0
  if (cleaned.startsWith('0')) {
    return '+60' + cleaned.substring(1)
  }
  
  // Return as-is with + if no match
  return '+' + cleaned
}

// Get display phone (for input field - without country code)
function getDisplayPhone(phone: string): string {
  if (!phone) return ''
  
  // Remove +60 and show as 01x format
  if (phone.startsWith('+60')) {
    return '0' + phone.substring(3)
  }
  
  // Remove +65 for Singapore
  if (phone.startsWith('+65')) {
    return phone.substring(3)
  }
  
  // Remove leading +
  if (phone.startsWith('+')) {
    return phone.substring(1)
  }
  
  return phone
}

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login")
  const { t } = useLanguage()

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background px-4 py-8">
      {/* Subtle warm gradient background */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at bottom right, rgba(161, 119, 85, 0.08) 0%, transparent 50%)"
        }}
      />
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at top left, rgba(161, 119, 85, 0.05) 0%, transparent 40%)"
        }}
      />

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="relative rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
          {/* Subtle inner accent */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(161, 119, 85, 0.03) 0%, transparent 50%)"
            }}
          />

          <div className="relative p-8">
            {/* Logo / Brand */}
            <div className="flex flex-col items-center justify-center mb-8">
              <h1 className="text-3xl font-semibold tracking-tight text-primary">
                JP&Co
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Casual Dining / Cakes / Coffee Roastery
              </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-6 bg-secondary/50 p-1 rounded-xl">
                <TabsTrigger 
                  value="login"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  {t("login", "signIn")}
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  {t("login", "register")}
                </TabsTrigger>
              </TabsList>

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: activeTab === "login" ? -10 : 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: activeTab === "login" ? 10 : -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === "login" ? <LoginForm /> : <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>}><RegisterForm /></Suspense>}
                </motion.div>
              </AnimatePresence>
            </Tabs>
          </div>
        </div>

        {/* Bottom decorative element */}
        <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      </motion.div>
    </main>
  )
}

function LoginForm() {
  const [contactMethod, setContactMethod] = useState<"phone" | "email">("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordMethod, setForgotPasswordMethod] = useState<"email" | "phone">("email")
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotPhone, setForgotPhone] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [generatedOtp, setGeneratedOtp] = useState("")
  const [otpInput, setOtpInput] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const [foundUserId, setFoundUserId] = useState<string | null>(null) // Store found user ID
  const router = useRouter()
  const supabase = createClient()
  const { t } = useLanguage()

  // Handle forgot password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsResetting(true)

    try {
      if (forgotPasswordMethod === "email") {
        // Email password reset using Supabase
        if (!forgotEmail.trim()) {
          toast.error(t("login", "pleaseEnterEmail"))
          return
        }

        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        })

        if (error) throw error

        setResetSent(true)
        toast.success(t("common", "success"), {
          description: t("login", "resetLinkSent")
        })
      } else {
        // Phone password reset via WhatsApp
        if (!forgotPhone.trim()) {
          toast.error(t("login", "pleaseEnterPhone"))
          return
        }

        // Clean and format phone number
        const cleanPhone = forgotPhone.replace(/\D/g, '')
        const formattedPhone = formatPhoneWithCountryCode(forgotPhone)
        
        // Check if user exists - try multiple formats
        let profile = null
        
        // Method 1: Try formatted phone (+60123456789)
        const { data: formattedMatch } = await supabase
          .from("profiles")
          .select("id, full_name, phone, email")
          .eq("phone", formattedPhone)
          .single()
        
        if (formattedMatch) {
          profile = formattedMatch
        } else {
          // Method 2: Try exact input
          const { data: exactMatch } = await supabase
            .from("profiles")
            .select("id, full_name, phone, email")
            .eq("phone", forgotPhone)
            .single()
          
          if (exactMatch) {
            profile = exactMatch
          } else {
            // Method 3: Try by fake email format (for old users)
            const fakeEmail = `user${cleanPhone}@jpco-member.com`
            
            const { data: emailMatch } = await supabase
              .from("profiles")
              .select("id, full_name, phone, email")
              .eq("email", fakeEmail)
              .single()
            
            if (emailMatch) {
              profile = emailMatch
              // Update phone in profile with formatted version
              await supabase
                .from("profiles")
                .update({ phone: formattedPhone, email: null })
                .eq("id", emailMatch.id)
            } else {
              // Method 4: Search by email LIKE pattern
              const { data: likeMatch } = await supabase
                .from("profiles")
                .select("id, full_name, phone, email")
                .ilike("email", `%${cleanPhone}%`)
                .limit(1)
                .single()
              
              if (likeMatch) {
                profile = likeMatch
                // Update phone
                await supabase
                  .from("profiles")
                  .update({ phone: formattedPhone, email: null })
                  .eq("id", likeMatch.id)
              }
            }
          }
        }

        if (!profile) {
          toast.error(t("login", "invalidCredentials"))
          return
        }
        
        setFoundUserId(profile.id)

        // Generate OTP server-side
        const otpRes = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: forgotPhone }),
        })
        const otpData = await otpRes.json()

        if (!otpData.success || !otpData.otp) {
          toast.error(t("common", "error"), { description: t("common", "retry") })
          return
        }

        if (otpData.userId) setFoundUserId(otpData.userId)

        let waPhone = cleanPhone
        if (waPhone.startsWith("0")) {
          waPhone = "60" + waPhone.substring(1)
        }

        const message = `JP&Co Password Reset\n\nYour verification code: ${otpData.otp}\n\nValid for 10 minutes.\nDo not share with anyone.`
        const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`
        
        window.open(waUrl, "_blank")
        
        setResetSent(true)
        setGeneratedOtp(otpData.otp)
        toast.success(t("login", "whatsappOpened"), {
          description: t("login", "sendMessageToReceiveOtp")
        })
      }
    } catch {
      toast.error(t("common", "error"), {
        description: t("common", "retry")
      })
    } finally {
      setIsResetting(false)
    }
  }

  const closeForgotPassword = () => {
    setShowForgotPassword(false)
    setResetSent(false)
    setForgotEmail("")
    setForgotPhone("")
    setGeneratedOtp("")
    setOtpInput("")
    setNewPassword("")
    setOtpVerified(false)
    setFoundUserId(null)
  }

  // Verify OTP and reset password
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (otpInput !== generatedOtp) {
      toast.error(t("login", "invalidOtp"), { description: t("login", "checkCodeAndTryAgain") })
      return
    }

    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      toast.error(t("login", "passwordTooWeak"))
      return
    }

    setIsVerifying(true)

    try {
      // Use the stored user ID from when we found them
      if (!foundUserId) {
        toast.error(t("common", "error"), { description: t("common", "retry") })
        setResetSent(false)
        return
      }

      const cleanPhone = forgotPhone.replace(/\D/g, '')

      // Try API first, fallback to WhatsApp support
      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: foundUserId,
            phone: forgotPhone,
            otp: otpInput,
            newPassword: newPassword
          })
        })

        // Check if response is JSON
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const result = await response.json()
          if (!response.ok) {
            throw new Error(result.error || "Failed to reset password")
          }
          
          setOtpVerified(true)
          toast.success(t("login", "passwordResetSuccess"), {
            description: t("login", "canLoginWithNewPassword")
          })
          
          setTimeout(() => {
            closeForgotPassword()
          }, 2000)
          return
        }
      } catch {
        // API failed, using fallback
      }

      // Fallback: Open WhatsApp to contact support
      const supportMessage = `JP&Co 密码重置请求\n\n用户ID: ${foundUserId}\n手机号: ${forgotPhone}\n验证码: ${otpInput}\n\n请帮我重置密码。`
      const waUrl = `https://wa.me/60128953348?text=${encodeURIComponent(supportMessage)}`
      
      window.open(waUrl, "_blank")
      
      toast.info("Please contact support", {
        description: "WhatsApp has been opened. Send the message to reset your password."
      })
      
      setOtpVerified(true)

    } catch {
      toast.error(t("common", "error"), { description: t("common", "retry") })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error(contactMethod === "phone" ? t("login", "pleaseEnterPhone") : t("login", "pleaseEnterEmail"))
      return
    }

    setIsLoading(true)

    try {
      if (contactMethod === "email") {
        // Email + Password login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data.user) {
          // Update last_visit on login
          await supabase
            .from("profiles")
            .update({ last_visit: new Date().toISOString() })
            .eq("id", data.user.id)

          // Get user profile to determine redirect
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single()

          console.log("Profile data:", profile, "Error:", profileError)

          toast.success("Login successful!")

          // Clear banner flags so they show on every login
          sessionStorage.removeItem("banner_login_shown")
          sessionStorage.removeItem("banner_popup_shown")

          // Redirect based on role - use window.location for reliable redirect
          if (profile?.role === "admin") {
            window.location.href = "/admin"
          } else if (profile?.role === "staff") {
            window.location.href = "/staff"
          } else {
            window.location.href = "/pwa"
          }
        }
      } else {
        // Phone login - use the generated email format
        const phoneEmail = `user${email.replace(/\D/g, '')}@jpco-member.com`
        const { data, error } = await supabase.auth.signInWithPassword({
          email: phoneEmail,
          password,
        })

        if (error) throw error

        if (data.user) {
          // Update last_visit on login
          await supabase
            .from("profiles")
            .update({ last_visit: new Date().toISOString() })
            .eq("id", data.user.id)

          // Get user profile to determine redirect
          const { data: profile2 } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single()

          toast.success(t("login", "loginSuccess"))

          // Clear banner flags so they show on every login
          sessionStorage.removeItem("banner_login_shown")
          sessionStorage.removeItem("banner_popup_shown")

          // Redirect based on role - use window.location for reliable redirect
          if (profile2?.role === "admin") {
            window.location.href = "/admin"
          } else if (profile2?.role === "staff") {
            window.location.href = "/staff"
          } else {
            window.location.href = "/pwa"
          }
        }
      }
    } catch {
      toast.error(t("login", "invalidCredentials"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleLogin} className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-primary">{t("login", "welcomeBack")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("login", "signInDesc")}
        </p>
      </div>

      {/* Toggle Contact Method */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={contactMethod === "phone" ? "default" : "outline"}
          size="sm"
          onClick={() => setContactMethod("phone")}
          className="flex-1"
        >
          <Phone className="size-4 mr-1" />
          {t("login", "phone")}
        </Button>
        <Button
          type="button"
          variant={contactMethod === "email" ? "default" : "outline"}
          size="sm"
          onClick={() => setContactMethod("email")}
          className="flex-1"
        >
          <Mail className="size-4 mr-1" />
          {t("login", "email")}
        </Button>
      </div>

      {/* Input Fields */}
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {contactMethod === "phone" ? (
                <Phone className="size-4" />
              ) : (
                <Mail className="size-4" />
              )}
            </div>
            <Input
              type={contactMethod === "phone" ? "tel" : "email"}
              placeholder={contactMethod === "phone" ? t("login", "phoneNumber") : t("login", "emailOptional")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12 bg-secondary border-border focus:border-primary transition-all"
            />
          </div>
          
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="size-4" />
            </div>
            <Input
              type="password"
              placeholder={t("login", "password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 bg-secondary border-border focus:border-primary transition-all"
              required
            />
          </div>
        </div>

        {/* Sign In Button */}
        <Button 
          type="submit"
          disabled={isLoading}
          className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              {t("login", "signingIn")}
            </>
          ) : (
            t("login", "signIn")
          )}
        </Button>
      </div>

      {/* Footer Link */}
      <div className="text-center">
        <button 
          type="button"
          onClick={() => setShowForgotPassword(true)}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {t("login", "forgotPassword")}
        </button>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {resetSent ? "Check Your Email" : "Reset Password"}
            </DialogTitle>
          </DialogHeader>

          {resetSent && forgotPasswordMethod === "email" ? (
            // Email Success State
            <div className="flex flex-col items-center py-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-muted-foreground mb-6">
                We&apos;ve sent a password reset link to your email. Please check your inbox and follow the instructions.
              </p>
              <Button onClick={closeForgotPassword} className="w-full">
                Back to Login
              </Button>
            </div>
          ) : resetSent && forgotPasswordMethod === "phone" ? (
            // Phone OTP Verification State
            otpVerified ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="text-lg font-medium mb-2">Password Reset!</p>
                <p className="text-muted-foreground">
                  You can now login with your new password.
                </p>
              </div>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    We&apos;ve opened WhatsApp with your verification code. 
                    Send that message to yourself, then enter the code below.
                  </p>
                </div>

                {/* OTP Input */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Verification Code (6 digits)
                  </label>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                {/* New Password */}
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-10"
                      minLength={6}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    At least 6 characters
                  </p>
                </div>

                {/* Submit */}
                <Button type="submit" className="w-full" disabled={isVerifying || otpInput.length !== 6}>
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>

                {/* Resend */}
                <button
                  type="button"
                  onClick={() => {
                    setResetSent(false)
                    setGeneratedOtp("")
                    setOtpInput("")
                  }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground"
                >
                  Didn&apos;t receive code? Try again
                </button>
              </form>
            )
          ) : (
            // Reset Form
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {/* Method Toggle */}
              <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg">
                <button
                  type="button"
                  onClick={() => setForgotPasswordMethod("email")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-all ${
                    forgotPasswordMethod === "email"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setForgotPasswordMethod("phone")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm transition-all ${
                    forgotPasswordMethod === "phone"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Phone className="w-4 h-4" />
                  Phone
                </button>
              </div>

              {/* Input */}
              {forgotPasswordMethod === "email" ? (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Enter your registered email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Enter your registered phone number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="012-345 6789"
                      value={forgotPhone}
                      onChange={(e) => setForgotPhone(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    If you don&apos;t have an email linked, you&apos;ll need to contact support.
                  </p>
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={isResetting}>
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>

              {/* Back */}
              <button
                type="button"
                onClick={closeForgotPassword}
                className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </form>
  )
}

function RegisterForm() {
  const [agreed, setAgreed] = useState(false)
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [referralCode, setReferralCode] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { t } = useLanguage()

  // Capture referral code from URL
  useEffect(() => {
    const ref = searchParams.get("ref")
    if (ref) setReferralCode(ref)
  }, [searchParams])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!agreed) {
      toast.error(t("login", "pleaseAgreeTerms"))
      return
    }

    if (!fullName || !phone) {
      toast.error(t("login", "fillRequiredFields"))
      return
    }

    if (!password) {
      toast.error(t("login", "passwordRequired"))
      return
    }

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error(t("login", "passwordTooWeak"))
      return
    }

    // Format phone with country code for storage
    const formattedPhone = formatPhoneWithCountryCode(phone)
    const cleanPhone = phone.replace(/\D/g, '')
    
    // If no email provided, use phone as identifier with valid email format
    const loginEmail = email || `user${cleanPhone}@jpco-member.com`

    setIsLoading(true)

    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: loginEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: formattedPhone, // Store formatted phone
          },
        },
      })

      if (error) throw error

      if (data.user) {
        // Update profile with additional info
        const profileUpdate: any = {
          full_name: fullName,
          phone: formattedPhone, // Store with country code like +60123456789
        }
        
        // Only set email if user provided a real one
        if (email && email.trim()) {
          profileUpdate.email = email.trim()
        } else {
          profileUpdate.email = null // Keep email empty if not provided
        }
        
        await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", data.user.id)

        // Process referral if present
        if (referralCode) {
          try {
            // Find the referrer by referral_code
            const { data: referrer } = await supabase
              .from("profiles")
              .select("id")
              .eq("referral_code", referralCode.toUpperCase())
              .single()

            if (referrer && referrer.id !== data.user.id) {
              // Find active campaign
              const { data: campaign } = await supabase
                .from("referral_campaigns")
                .select("*")
                .eq("is_active", true)
                .order("created_at", { ascending: false })
                .limit(1)
                .single()

              // Create referral record
              await supabase.from("referrals").insert({
                campaign_id: campaign?.id || null,
                referrer_id: referrer.id,
                referee_id: data.user.id,
                status: "completed",
              })

              // Give rewards if campaign exists
              if (campaign) {
                // Referrer reward
                if (campaign.referrer_reward_type === "points" && campaign.referrer_reward_value > 0) {
                  // add_points RPC: p_user_id, p_amount (DECIMAL), p_reason, p_staff_id
                  await supabase.rpc("add_points", {
                    p_user_id: referrer.id,
                    p_amount: campaign.referrer_reward_value,
                    p_reason: `Referral bonus: invited ${fullName}`,
                    p_staff_id: referrer.id, // self-attributed
                  })
                  await supabase.from("referrals")
                    .update({ referrer_rewarded: true, status: "rewarded" })
                    .eq("referrer_id", referrer.id)
                    .eq("referee_id", data.user.id)
                }
                if (campaign.referrer_reward_type === "voucher" && campaign.referrer_voucher_id) {
                  await supabase.from("user_vouchers").insert({
                    user_id: referrer.id,
                    voucher_id: campaign.referrer_voucher_id,
                  })
                  await supabase.from("referrals")
                    .update({ referrer_rewarded: true, status: "rewarded" })
                    .eq("referrer_id", referrer.id)
                    .eq("referee_id", data.user.id)
                }

                // Referee reward
                if (campaign.referee_reward_type === "points" && campaign.referee_reward_value > 0) {
                  await supabase.rpc("add_points", {
                    p_user_id: data.user.id,
                    p_amount: campaign.referee_reward_value,
                    p_reason: "Welcome bonus: referred by a friend",
                    p_staff_id: data.user.id, // self-attributed
                  })
                  await supabase.from("referrals")
                    .update({ referee_rewarded: true })
                    .eq("referrer_id", referrer.id)
                    .eq("referee_id", data.user.id)
                }
                if (campaign.referee_reward_type === "voucher" && campaign.referee_voucher_id) {
                  await supabase.from("user_vouchers").insert({
                    user_id: data.user.id,
                    voucher_id: campaign.referee_voucher_id,
                  })
                  await supabase.from("referrals")
                    .update({ referee_rewarded: true })
                    .eq("referrer_id", referrer.id)
                    .eq("referee_id", data.user.id)
                }
              }
            }
          } catch {
            // Referral processing failed, but registration succeeded - don't block
            console.error("Referral processing failed")
          }
        }

        toast.success(t("login", "accountCreated"))
        // Clear banner flags so they show for new users
        sessionStorage.removeItem("banner_login_shown")
        sessionStorage.removeItem("banner_popup_shown")
        window.location.href = "/pwa"
      }
    } catch {
      toast.error(t("login", "registrationFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-primary">{t("login", "joinTheClub")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("login", "unlockRewards")}
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Full Name */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <User className="size-4" />
          </div>
          <Input
            type="text"
            placeholder={`${t("login", "fullName")} *`}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="pl-10 h-12 bg-secondary border-border focus:border-primary transition-all"
            required
          />
        </div>

        {/* Phone Number */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Phone className="size-4" />
          </div>
          <Input
            type="tel"
            placeholder={`${t("login", "phoneNumber")} *`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10 h-12 bg-secondary border-border focus:border-primary transition-all"
            required
          />
        </div>

        {/* Email */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Mail className="size-4" />
          </div>
          <Input
            type="email"
            placeholder={t("login", "emailOptional")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-12 bg-secondary border-border focus:border-primary transition-all"
          />
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Lock className="size-4" />
            </div>
            <Input
              type="password"
              placeholder={t("login", "passwordMin")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12 bg-secondary border-border focus:border-primary transition-all"
              required
              minLength={8}
            />
          </div>
          {password.length > 0 && (() => {
            const hasUpper = /[A-Z]/.test(password)
            const hasLower = /[a-z]/.test(password)
            const hasNumber = /[0-9]/.test(password)
            const hasSpecial = /[^A-Za-z0-9]/.test(password)
            const score = (password.length >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasLower ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0)
            const strength = score <= 2 ? "weak" : score <= 3 ? "medium" : "strong"
            const color = strength === "weak" ? "bg-red-500" : strength === "medium" ? "bg-yellow-500" : "bg-green-500"
            const width = strength === "weak" ? "w-1/3" : strength === "medium" ? "w-2/3" : "w-full"
            const label = t("login", strength === "weak" ? "passwordWeak" : strength === "medium" ? "passwordMedium" : "passwordStrong")
            return (
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${color} ${width} rounded-full transition-all duration-300`} />
                </div>
                <p className="text-xs text-muted-foreground">{t("login", "passwordStrength")}: {label}</p>
              </div>
            )
          })()}
        </div>

        {/* Referral Code (optional) */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">{t("login", "referralCode")}</label>
          <Input
            placeholder={t("login", "referralCodePlaceholder")}
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            className="h-12 bg-secondary/50 border-border focus:border-primary"
            maxLength={10}
          />
        </div>

        {/* Terms Checkbox */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(checked === true)}
            className="mt-0.5 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          />
          <label 
            htmlFor="terms" 
            className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
          >
            {t("login", "agreeToTerms")}{" "}
            <span className="text-primary hover:underline cursor-pointer">{t("login", "termsOfService")}</span>
            {" "}{t("login", "and")}{" "}
            <span className="text-primary hover:underline cursor-pointer">{t("login", "loyaltyProgram")}</span>
          </label>
        </div>

        {/* Create Account Button */}
        <Button 
          type="submit"
          className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-200"
          disabled={!agreed || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              {t("login", "creatingAccount")}
            </>
          ) : (
            t("login", "createAccount")
          )}
        </Button>
      </div>
    </form>
  )
}
