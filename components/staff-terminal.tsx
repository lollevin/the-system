"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  Gift, 
  Coins, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ScanLine, 
  Camera, 
  Keyboard, 
  LogOut, 
  Loader2,
  QrCode,
  X,
  Zap,
  Settings,
  AlertTriangle,
  Star,
  Cake,
  Shield,
  ChevronDown,
  ImageIcon
} from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { Profile } from "@/lib/supabase/types"
import { formatCurrency, calculatePoints } from "@/lib/utils"
import { useLanguage } from "@/lib/i18n"
import { usePointsRate } from "@/lib/use-points-rate"
import { Trash2 } from "lucide-react"

const quickAmounts = [
  { label: "RM 20", value: 20 },
  { label: "RM 50", value: 50 },
  { label: "RM 100", value: 100 },
  { label: "Custom", value: 0 },
]

interface StaffTerminalProps {
  user: User
  profile: Profile
}

export function StaffTerminal({ user, profile }: StaffTerminalProps) {
  const [customerId, setCustomerId] = useState("")
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [inputMode, setInputMode] = useState<"manual" | "qr">("manual")
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [voucherCode, setVoucherCode] = useState("")
  const [voucherInputMode, setVoucherInputMode] = useState<"manual" | "qr">("manual")
  const [voucherStatus, setVoucherStatus] = useState<"idle" | "valid" | "invalid" | "redeemed">("idle")
  const [voucherDetails, setVoucherDetails] = useState<any>(null)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [customerInfo, setCustomerInfo] = useState<Profile | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [scannerReady, setScannerReady] = useState(false)
  const [recentAIVouchers, setRecentAIVouchers] = useState<any[]>([])
  const [showAIVouchers, setShowAIVouchers] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [recentPointsWarning, setRecentPointsWarning] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [isCapturing, setIsCapturing] = useState(false)
  
  const scannerRef = useRef<any>(null)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { language, setLanguage, t } = useLanguage()
  const { rmPerPoint } = usePointsRate()
  const [deleteTargetTxId, setDeleteTargetTxId] = useState<string | null>(null)
  const [isDeletingTx, setIsDeletingTx] = useState(false)

  // Fetch recent activity and AI vouchers
  useEffect(() => {
    fetchRecentActivity()
    fetchRecentAIVouchers()
  }, [])

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  const fetchRecentActivity = async () => {
    const { data } = await supabase
      .from("transactions")
      .select(`
        *,
        user:profiles!transactions_user_id_fkey(full_name)
      `)
      .eq("staff_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)

    if (data) {
      setRecentActivity(data.map((tx: any) => ({
        id: tx.id,
        name: tx.user?.full_name || "Customer",
        points: tx.points,
        type: tx.type,
        amount: tx.amount,
        time: getTimeAgo(tx.created_at),
      })))
    }
  }

  const handleDeleteTransaction = async () => {
    if (!deleteTargetTxId) return
    setIsDeletingTx(true)
    try {
      const res = await fetch("/api/staff/delete-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: deleteTargetTxId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Delete failed")

      toast({
        title: t("staff", "staffDeleted"),
        description: `-${data.points_reversed || 0} pts`,
      })
      setDeleteTargetTxId(null)
      fetchRecentActivity()
    } catch (err: any) {
      toast({
        title: t("staff", "staffDeleteFailed"),
        description: err?.message || "",
        variant: "destructive",
      })
    } finally {
      setIsDeletingTx(false)
    }
  }

  const fetchRecentAIVouchers = async () => {
    // Fetch recent personal/AI vouchers that are not yet used
    const { data } = await supabase
      .from("user_vouchers")
      .select(`
        *,
        voucher:vouchers(*),
        user:profiles!user_vouchers_user_id_fkey(full_name, phone)
      `)
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      // Filter to only show personal/AI vouchers
      const aiVouchers = data.filter((v: any) => 
        v.voucher?.voucher_type === "personal" || v.voucher?.created_by_ai
      )
      setRecentAIVouchers(aiVouchers)
    }
  }

  const getTimeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins} mins ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} hours ago`
    return `${Math.floor(hours / 24)} days ago`
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Start QR Scanner
  const startScanner = async (target: "customer" | "voucher") => {
    setIsScanning(true)
    setScannerReady(false)
    
    try {
      // Check if we're on HTTPS or localhost (required for camera access)
      const isSecure = window.location.protocol === 'https:' || 
                       window.location.hostname === 'localhost' ||
                       window.location.hostname === '127.0.0.1'
      
      if (!isSecure) {
        throw new Error("Camera requires HTTPS connection")
      }

      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Browser does not support camera access")
      }

      // Check for available cameras
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(device => device.kind === 'videoinput')
      
      if (cameras.length === 0) {
        throw new Error("No camera found on this device")
      }

      const { Html5Qrcode } = await import("html5-qrcode")
      
      const scannerId = target === "customer" ? "customer-scanner" : "voucher-scanner"
      
      // Wait for DOM element to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const html5QrCode = new Html5Qrcode(scannerId)
      scannerRef.current = html5QrCode

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Success callback
          if (target === "customer") {
            setCustomerId(decodedText)
            lookupCustomer(decodedText)
          } else {
            setVoucherCode(decodedText.toUpperCase())
          }
          stopScanner()
          toast({
            title: "Scan Successful",
            description: `Read: ${decodedText.substring(0, 20)}...`,
          })
        },
        () => {
          // Error callback - ignore, just means no QR found yet
        }
      )
      
      setScannerReady(true)
    } catch (err: any) {
      // Scanner initialization failed - provide helpful error message
      let errorMessage = "Please use manual input"
      if (err.message?.includes("HTTPS")) {
        errorMessage = "Camera requires HTTPS, please use manual input"
      } else if (err.message?.includes("No camera")) {
        errorMessage = "No camera detected, please use manual input"
      } else if (err.message?.includes("not support")) {
        errorMessage = "Browser does not support camera, please use manual input"
      } else if (err.name === "NotAllowedError") {
        errorMessage = "Camera permission denied, please allow in browser settings"
      }
      
      toast({
        title: "Cannot Start Camera",
        description: errorMessage,
        variant: "destructive",
      })
      setIsScanning(false)
      
      // Switch back to manual mode
      if (target === "customer") {
        setInputMode("manual")
      } else {
        setVoucherInputMode("manual")
      }
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        // Check if scanner is running before stopping
        const state = scannerRef.current.getState?.()
        if (state === 2 || state === 3) { // SCANNING or PAUSED
          await scannerRef.current.stop()
        }
      } catch (err) {
        // Ignore stop errors - scanner might not be running
      } finally {
        scannerRef.current = null
      }
    }
    setIsScanning(false)
    setScannerReady(false)
  }

  // Smart lookup - fuzzy search by ID, phone, email, or name
  const lookupCustomer = async (identifier: string) => {
    if (!identifier.trim()) {
      setCustomerInfo(null)
      setSearchFailed(false)
      setIsSearching(false)
      setSearchResults([])
      setShowPicker(false)
      return
    }

    setIsSearching(true)
    setSearchFailed(false)
    setSearchResults([])
    setShowPicker(false)

    try {
      const cleanId = identifier.trim()
      
      // 1. Try exact UUID match first (QR code scans)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(cleanId)) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "customer")
          .eq("id", cleanId)
          .maybeSingle()
        
        if (data) {
          setCustomerInfo(data)
          setSearchFailed(false)
          setIsSearching(false)
          await checkRecentPoints(data.id)
          return
        }
      }

      // 2. Smart search - detect input type
      const isPhoneInput = /^\+?\d[\d\s-]{2,}$/.test(cleanId)
      
      let allResults: Profile[] = []

      if (isPhoneInput) {
        // Search by phone number
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "customer")
          .ilike("phone", `%${cleanId.replace(/\D/g, '')}%`)
          .limit(5)
        if (data) allResults = data
      } else {
        // Search by name (fuzzy) + email + phone
        const { data: nameResults } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "customer")
          .ilike("full_name", `%${cleanId}%`)
          .limit(5)
        
        const { data: phoneResults } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "customer")
          .ilike("phone", `%${cleanId}%`)
          .limit(3)
        
        const { data: emailResults } = await supabase
          .from("profiles")
          .select("*")
          .eq("role", "customer")
          .ilike("email", `%${cleanId}%`)
          .limit(3)

        // Merge and deduplicate
        const merged = [...(nameResults || []), ...(phoneResults || []), ...(emailResults || [])]
        const seen = new Set<string>()
        allResults = merged.filter(c => {
          if (seen.has(c.id)) return false
          seen.add(c.id)
          return true
        })
      }

      if (allResults.length === 1) {
        // Single match - auto-select
        setCustomerInfo(allResults[0])
        setSearchFailed(false)
        await checkRecentPoints(allResults[0].id)
      } else if (allResults.length > 1) {
        // Multiple matches - show picker
        setSearchResults(allResults)
        setShowPicker(true)
        setCustomerInfo(null)
      } else {
        setCustomerInfo(null)
        setSearchFailed(true)
      }
    } catch {
      setCustomerInfo(null)
      setSearchFailed(true)
    } finally {
      setIsSearching(false)
    }
  }

  // Select customer from picker
  const selectCustomer = async (customer: Profile) => {
    setCustomerInfo(customer)
    setShowPicker(false)
    setSearchResults([])
    setCustomerId(customer.id)
    await checkRecentPoints(customer.id)
  }

  // Check if customer received points recently (prevent double-add)
  const checkRecentPoints = async (customerId: string) => {
    try {
      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data } = await supabase
        .from("transactions")
        .select("created_at, amount, points")
        .eq("user_id", customerId)
        .eq("type", "earn")
        .gte("created_at", thirtyMinsAgo)
        .order("created_at", { ascending: false })
        .limit(1)
      
      if (data && data.length > 0) {
        const minsAgo = Math.floor((Date.now() - new Date(data[0].created_at).getTime()) / 60000)
        setRecentPointsWarning(`This customer received ${data[0].points} pts (RM${data[0].amount}) ${minsAgo} min ago`)
      } else {
        setRecentPointsWarning(null)
      }
    } catch {
      setRecentPointsWarning(null)
    }
  }

  // Get VIP tier from total spent
  const getVipTier = (totalSpent: number) => {
    if (totalSpent >= 5000) return { name: "Diamond", color: "text-blue-500", bg: "bg-blue-500/10" }
    if (totalSpent >= 3000) return { name: "Gold", color: "text-amber-500", bg: "bg-amber-500/10" }
    if (totalSpent >= 1000) return { name: "Silver", color: "text-gray-400", bg: "bg-gray-400/10" }
    return { name: "Bronze", color: "text-orange-600", bg: "bg-orange-600/10" }
  }

  // Check if birthday is coming
  const getBirthdayInfo = (birthday: string | null) => {
    if (!birthday) return null
    const bday = new Date(birthday)
    const today = new Date()
    const thisYearBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate())
    const diff = Math.ceil((thisYearBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff >= -1 && diff <= 7) return diff <= 0 ? "Today!" : `In ${diff} days`
    return null
  }

  // Debounced customer lookup
  useEffect(() => {
    if (!customerId) {
      setCustomerInfo(null)
      setSearchFailed(false)
      setIsSearching(false)
      return
    }
    
    setIsSearching(true)
    const timer = setTimeout(() => {
      lookupCustomer(customerId)
    }, 300) // Reduced to 300ms for faster response
    return () => clearTimeout(timer)
  }, [customerId])

  const handleAddPoints = async () => {
    const amount = selectedAmount === 0 ? parseFloat(customAmount) : selectedAmount
    if (!customerId || !amount || amount <= 0) {
      toast({
        title: t("common", "error"),
        description: "Please enter customer ID and amount",
        variant: "destructive",
      })
      return
    }

    // Smart guard: high amount warning
    if (amount > 500) {
      setConfirmMessage(`High amount: RM ${amount} (${calculatePoints(amount, rmPerPoint)} pts). Confirm?`)
      setPendingAction(() => () => executeAddPoints(amount))
      setShowConfirmDialog(true)
      return
    }

    // Smart guard: duplicate add warning (points added within 30 mins)
    if (recentPointsWarning) {
      setConfirmMessage(`Warning: ${recentPointsWarning}. Add again?`)
      setPendingAction(() => () => executeAddPoints(amount))
      setShowConfirmDialog(true)
      return
    }

    await executeAddPoints(amount)
  }

  const executeAddPoints = async (amount: number) => {
    setShowConfirmDialog(false)
    setIsProcessing(true)

    try {
      const customer = customerInfo
      if (!customer) {
        toast({
          title: t("staff", "customerNotFound"),
          description: "Please search and select a customer first",
          variant: "destructive",
        })
        return
      }

      const points = calculatePoints(amount, rmPerPoint)

      // Create transaction
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: customer.id,
        staff_id: user.id,
        type: "earn",
        points,
        amount,
        reason: `Spent ${formatCurrency(amount)}`,
      })

      if (txError) throw new Error(txError.message || "Failed to create transaction")

      // Update customer points
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          points_balance: (customer.points_balance || 0) + points,
          total_spent: (customer.total_spent || 0) + amount,
          visit_count: (customer.visit_count || 0) + 1,
          last_visit: new Date().toISOString(),
        })
        .eq("id", customer.id)

      if (updateError) throw new Error(updateError.message || "Failed to update points")

      // Log staff activity for admin monitoring (non-blocking)
      try {
        await supabase.from("staff_activity_log").insert({
          staff_id: user.id,
          action_type: "add_points",
          target_customer_id: customer.id,
          details: { amount, points, customer_name: customer.full_name },
        })
      } catch { /* ignore if table not ready */ }

      toast({
        title: t("staff", "pointsAdded"),
        description: `${customer.full_name || "Customer"} +${points} pts`,
      })

      // Reset form
      setCustomerId("")
      setSelectedAmount(null)
      setCustomAmount("")
      setCustomerInfo(null)
      setRecentPointsWarning(null)
      setSearchResults([])
      setShowPicker(false)

      // Refresh activity
      fetchRecentActivity()

    } catch (error: any) {
      toast({
        title: t("common", "error"),
        description: error?.message || t("common", "retry"),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVerifyVoucher = async () => {
    if (!voucherCode.trim()) return

    setIsProcessing(true)
    setVoucherStatus("idle")

    const codeToCheck = voucherCode.trim().toUpperCase()

    try {
      // Query user_vouchers - specify the exact foreign key relationship
      const { data: allUserVouchers, error: listError } = await supabase
        .from("user_vouchers")
        .select(`
          *,
          voucher:vouchers(*),
          customer:profiles!user_vouchers_user_id_fkey(full_name, phone)
        `)
      
      // Find the voucher by code (case-insensitive)
      let userVoucher = null
      if (allUserVouchers && allUserVouchers.length > 0) {
        userVoucher = allUserVouchers.find((v: any) => 
          v.code === codeToCheck || 
          v.code?.toUpperCase() === codeToCheck ||
          v.code?.toLowerCase() === codeToCheck.toLowerCase()
        )
      }

      if (userVoucher) {
        if (userVoucher.is_used) {
          setVoucherStatus("invalid")
          setVoucherDetails({ message: "This voucher has already been used" })
        } else if (new Date(userVoucher.expires_at) < new Date()) {
          setVoucherStatus("invalid")
          setVoucherDetails({ message: "This voucher has expired" })
        } else {
          setVoucherStatus("valid")
          setVoucherDetails({
            id: userVoucher.id,
            name: userVoucher.voucher?.name || "Voucher",
            description: userVoucher.voucher?.description,
            discount_type: userVoucher.voucher?.discount_type,
            discount_value: userVoucher.voucher?.discount_value,
            customerId: userVoucher.user_id,
            customerName: userVoucher.customer?.full_name || "Customer",
            customerPhone: userVoucher.customer?.phone,
            type: "user_voucher",
          })
        }
        return
      }

      // Then check master vouchers table (without is_active filter first to debug)
      const { data: voucher, error: voucherError } = await supabase
        .from("vouchers")
        .select("*")
        .eq("code", codeToCheck)
        .maybeSingle()

      if (voucher) {
        // Check if voucher is active
        if (!voucher.is_active) {
          setVoucherStatus("invalid")
          setVoucherDetails({ message: "This voucher has been deactivated" })
          return
        }
        
        // Check if voucher is expired
        if (voucher.valid_until && new Date(voucher.valid_until) < new Date()) {
          setVoucherStatus("invalid")
          setVoucherDetails({ message: `This voucher expired on ${new Date(voucher.valid_until).toLocaleDateString()}` })
          return
        }
        
        setVoucherStatus("valid")
        setVoucherDetails({
          id: voucher.id,
          name: voucher.name,
          description: voucher.description,
          discount_type: voucher.discount_type,
          discount_value: voucher.discount_value,
          type: "master_voucher",
        })
      } else {
        setVoucherStatus("invalid")
        setVoucherDetails({ message: language === "zh" ? "无效的优惠券代码" : "Invalid voucher code" })
      }
    } catch {
      setVoucherStatus("invalid")
      setVoucherDetails({ message: language === "zh" ? "验证失败，请重试" : "Verification failed, please try again" })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRedeemVoucher = async () => {
    if (!voucherDetails || voucherStatus !== "valid") return

    setIsProcessing(true)

    try {
      // Get customer ID from voucher
      let customerId = voucherDetails.customerId || null
      let customerName = voucherDetails.customerName || "Unknown Customer"

      if (voucherDetails.type === "user_voucher") {
        // Mark user voucher as used
        const { error } = await supabase
          .from("user_vouchers")
          .update({
            is_used: true,
            used_at: new Date().toISOString(),
            used_by_staff_id: user.id,
          })
          .eq("id", voucherDetails.id)

        if (error) throw error
      }

      // Log the redemption as transaction for CUSTOMER (not staff)
      if (customerId) {
        await supabase.from("transactions").insert({
          user_id: customerId,  // Customer who used the voucher
          staff_id: user.id,    // Staff who processed it
          type: "redeem",
          points: 0,
          reason: `Used voucher: ${voucherDetails.name} (${voucherCode})`,
        })
      }

      // Send notification to admin
      try {
        await supabase.from("admin_notifications").insert({
          type: "system_alert",
          title: "Voucher Used",
          message: `${customerName} used voucher "${voucherDetails.name}", processed by ${profile?.full_name || "Staff"}`,
          severity: "info",
          related_user_id: customerId,
          related_staff_id: user.id,
          metadata: {
            voucher_code: voucherCode,
            voucher_name: voucherDetails.name,
            customer_name: customerName,
            staff_name: profile?.full_name
          }
        })
      } catch {
        // Ignore if notification table doesn't exist
      }

      // Log staff activity for admin monitoring (non-blocking)
      try {
        await supabase.from("staff_activity_log").insert({
          staff_id: user.id,
          action_type: "redeem_voucher",
          target_customer_id: customerId,
          details: { voucher_name: voucherDetails.name, voucher_code: voucherCode, customer_name: customerName },
        })
      } catch { /* ignore if table not ready */ }

      setVoucherStatus("redeemed")
      toast({
        title: "Success!",
        description: `${voucherDetails.name} has been redeemed`,
      })

      fetchRecentActivity()
      fetchRecentAIVouchers()

    } catch {
      toast({
        title: t("staff", "redeemFailed"),
        description: t("common", "retry"),
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // OCR fallback - capture photo and send to AI for reading
  const handleCaptureOCR = async (target: "customer" | "voucher") => {
    setIsCapturing(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      const video = document.createElement("video")
      video.srcObject = stream
      await video.play()
      
      // Wait a moment for camera to focus
      await new Promise(r => setTimeout(r, 1500))
      
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext("2d")!.drawImage(video, 0, 0)
      
      // Stop camera
      stream.getTracks().forEach(t => t.stop())
      
      const imageData = canvas.toDataURL("image/jpeg", 0.8)
      
      // Send to OCR API
      const res = await fetch("/api/ai/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData, target }),
      })
      
      const result = await res.json()
      
      if (result.text) {
        if (target === "customer") {
          setCustomerId(result.text)
        } else {
          setVoucherCode(result.text)
        }
        toast({ title: "Captured!", description: `Read: ${result.text}` })
      } else {
        toast({ title: "Could not read", description: "Please try again or enter manually", variant: "destructive" })
      }
    } catch (err: any) {
      toast({
        title: "Camera error",
        description: err?.message?.includes("NotAllowed") ? "Camera access denied. HTTPS required." : "Could not access camera",
        variant: "destructive",
      })
    } finally {
      setIsCapturing(false)
    }
  }

  const handleResetVoucher = () => {
    setVoucherCode("")
    setVoucherStatus("idle")
    setVoucherDetails(null)
  }

  const isCustom = selectedAmount === 0
  const currentAmount = selectedAmount === 0 ? parseFloat(customAmount) || 0 : selectedAmount || 0

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-4 sm:p-6 pb-8">
      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">{t("common", "settings")}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-500 mb-2 block">{t("common", "language")}</label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={language === "en" ? "default" : "outline"}
                    onClick={() => setLanguage("en")}
                    className={language === "en" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
                  >
                    English
                  </Button>
                  <Button
                    variant={language === "zh" ? "default" : "outline"}
                    onClick={() => setLanguage("zh")}
                    className={language === "zh" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
                  >
                    中文
                  </Button>
                  <Button
                    variant={language === "ms" ? "default" : "outline"}
                    onClick={() => setLanguage("ms")}
                    className={language === "ms" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
                  >
                    Melayu
                  </Button>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowSettings(false)}
              className="w-full mt-6 bg-[#8b6f47] hover:bg-[#7a5f3a]"
            >
              {t("common", "confirm")}
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="mb-6 pt-2 flex items-start justify-between safe-area-top">
        <div>
          <div className="flex items-baseline gap-1 mb-1">
            <h1 className="text-3xl font-serif font-medium tracking-wide text-[#8b6f47]">
              JP&Co
            </h1>
            <span className="text-[8px] text-[#8b6f47]/60 tracking-wider align-top relative -top-3">TM</span>
          </div>
          <p className="text-xs text-zinc-500 tracking-wide">
            {t("staff", "staffLabel")}: {profile.full_name || user.email}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
            className="text-zinc-500 hover:text-zinc-900"
          >
            <Settings className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-zinc-500 hover:text-zinc-900"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <Tabs defaultValue="points" className="w-full">
        <TabsList className="w-full h-14 bg-zinc-100 border border-zinc-200 rounded-xl p-1 mb-6">
          <TabsTrigger
            value="points"
            className="flex-1 h-full text-base font-semibold data-[state=active]:bg-white data-[state=active]:text-[#8b6f47] data-[state=active]:shadow-sm rounded-lg gap-2 text-zinc-500"
          >
            <Coins className="size-5" />
            {t("staff", "addPoints")}
          </TabsTrigger>
          <TabsTrigger
            value="redeem"
            className="flex-1 h-full text-base font-semibold data-[state=active]:bg-white data-[state=active]:text-[#8b6f47] data-[state=active]:shadow-sm rounded-lg gap-2 text-zinc-500"
          >
            <Gift className="size-5" />
            {t("staff", "verifyVoucher")}
          </TabsTrigger>
        </TabsList>

        {/* Add Points Tab */}
        <TabsContent value="points" className="space-y-6">
          <div className="text-center mb-2">
            <h2 className="text-3xl font-bold text-zinc-900">{t("staff", "addPoints")}</h2>
            <p className="text-zinc-500 mt-1">{language === "zh" ? "扫描或输入客户信息" : "Scan or enter customer info"}</p>
          </div>

          {/* Input Mode Toggle */}
          <div className="flex gap-2 justify-center">
            <Button
              variant={inputMode === "manual" ? "default" : "outline"}
              onClick={() => { setInputMode("manual"); stopScanner(); }}
              className={inputMode === "manual" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
            >
              <Keyboard className="size-4 mr-2" />
              {t("staff", "manualInput")}
            </Button>
            <Button
              variant={inputMode === "qr" ? "default" : "outline"}
              onClick={() => { setInputMode("qr"); startScanner("customer"); }}
              className={inputMode === "qr" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
            >
              <QrCode className="size-4 mr-2" />
              {t("staff", "scanQR")}
            </Button>
          </div>

          {/* QR Scanner */}
          {inputMode === "qr" && isScanning && (
            <div className="relative">
              <div 
                id="customer-scanner" 
                className="w-full aspect-square max-w-sm mx-auto rounded-xl overflow-hidden bg-black"
              />
              {!scannerReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-xl">
                  <div className="text-center text-white">
                    <Loader2 className="size-8 animate-spin mx-auto mb-2" />
                    <p>{language === "zh" ? "正在启动相机..." : "Starting camera..."}</p>
                  </div>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={stopScanner}
                className="absolute top-2 right-2 bg-white/90"
              >
                <X className="size-4" />
              </Button>
              <p className="text-center text-sm text-zinc-500 mt-2">
                {language === "zh" ? "将客户的 QR 码对准相机" : "Point camera at customer's QR code"}
              </p>
            </div>
          )}

          {/* Manual Customer Input */}
          {inputMode === "manual" && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Name, phone, or email..."
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="h-14 text-lg text-center bg-zinc-50 border-2 border-zinc-300 rounded-xl placeholder:text-zinc-400 focus-visible:border-[#8b6f47] focus-visible:ring-[#8b6f47]/20 flex-1"
                />
                <Button
                  variant="outline"
                  onClick={() => handleCaptureOCR("customer")}
                  disabled={isCapturing}
                  className="h-14 w-14 rounded-xl border-2 border-zinc-300 shrink-0"
                  title="Capture with camera"
                >
                  {isCapturing ? <Loader2 className="size-5 animate-spin" /> : <ImageIcon className="size-5" />}
                </Button>
              </div>
            </div>
          )}

          {/* Multiple Results Picker */}
          {showPicker && searchResults.length > 1 && (
            <div className="space-y-2 border-2 border-[#8b6f47]/30 rounded-xl p-3 bg-amber-50/50">
              <p className="text-sm font-medium text-[#8b6f47]">
                {searchResults.length} customers found — select one:
              </p>
              {searchResults.map((c) => {
                const tier = getVipTier(c.total_spent || 0)
                return (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-200 hover:border-[#8b6f47] hover:bg-[#8b6f47]/5 transition-all text-left"
                  >
                    <div>
                      <span className="font-semibold text-zinc-900">{c.full_name || "No Name"}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${tier.bg} ${tier.color}`}>{tier.name}</span>
                      <p className="text-xs text-zinc-500 mt-0.5">{c.phone || c.email || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[#8b6f47]">{c.points_balance || 0} pts</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
          
          {/* Enhanced Customer Info Panel */}
          {customerInfo && (
            <div className="space-y-2">
              <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-900">{customerInfo.full_name || "Customer"}</span>
                        {(() => {
                          const tier = getVipTier(customerInfo.total_spent || 0)
                          return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${tier.bg} ${tier.color}`}><Star className="size-3 inline mr-0.5" />{tier.name}</span>
                        })()}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{customerInfo.phone || customerInfo.email || "—"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#8b6f47]">{customerInfo.points_balance || 0} <span className="text-xs font-normal">pts</span></p>
                    <p className="text-xs text-zinc-500">{customerInfo.visit_count || 0} visits</p>
                  </div>
                </div>

                {/* Extra info row */}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-emerald-200 text-xs text-zinc-600">
                  <span>Spent: RM {(customerInfo.total_spent || 0).toFixed(0)}</span>
                  <span>•</span>
                  <span>Last: {customerInfo.last_visit ? `${Math.floor((Date.now() - new Date(customerInfo.last_visit).getTime()) / 86400000)}d ago` : "Never"}</span>
                  {(() => {
                    const bday = getBirthdayInfo((customerInfo as any).birthday || null)
                    if (!bday) return null
                    return <><span>•</span><span className="text-pink-500 font-medium"><Cake className="size-3 inline mr-0.5" />{bday}</span></>
                  })()}
                </div>
              </div>

              {/* Duplicate add warning */}
              {recentPointsWarning && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm">
                  <AlertTriangle className="size-4 shrink-0" />
                  <span>{recentPointsWarning}</span>
                </div>
              )}
            </div>
          )}
          
          {customerId && isSearching && !isScanning && (
            <div className="flex items-center gap-2 text-zinc-500 text-sm px-2">
              <Loader2 className="size-4 animate-spin" />
              Searching...
            </div>
          )}
          
          {customerId && !customerInfo && !isSearching && searchFailed && !isScanning && !showPicker && (
            <div className="flex items-center gap-2 text-red-500 text-sm px-2">
              <XCircle className="size-4" />
              {t("staff", "customerNotFound")}
            </div>
          )}

          {/* Quick Amounts */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide">{t("staff", "selectAmount")}</p>
            <div className="grid grid-cols-2 gap-3">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount.label}
                  variant="outline"
                  onClick={() => {
                    setSelectedAmount(amount.value)
                    if (amount.value !== 0) setCustomAmount("")
                  }}
                  className={`h-16 text-xl font-bold rounded-xl transition-all ${
                    selectedAmount === amount.value
                      ? "bg-[#8b6f47] text-white border-[#8b6f47] hover:bg-[#7a5f3a] hover:text-white"
                      : "bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 hover:text-zinc-900"
                  }`}
                >
                  {amount.label === "Custom" ? t("staff", "custom") : amount.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount Input */}
          {isCustom && (
            <Input
              type="number"
              placeholder={t("staff", "enterAmount")}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="h-14 text-lg text-center bg-zinc-50 border-2 border-zinc-300 rounded-xl placeholder:text-zinc-400 focus-visible:border-[#8b6f47] focus-visible:ring-[#8b6f47]/20"
            />
          )}

          {/* Points Preview */}
          {currentAmount > 0 && (
            <div className="text-center py-3 bg-[#8b6f47]/10 rounded-xl">
              <p className="text-zinc-500 text-sm">{t("staff", "pointsToAdd")}</p>
              <p className="text-3xl font-bold text-[#8b6f47]">+{calculatePoints(currentAmount, rmPerPoint)}</p>
            </div>
          )}

          {/* Confirm Button */}
          <Button
            onClick={handleAddPoints}
            disabled={!customerInfo || currentAmount <= 0 || isProcessing}
            className="w-full h-16 text-xl font-bold bg-[#8b6f47] hover:bg-[#7a5f3a] text-white rounded-xl shadow-lg shadow-[#8b6f47]/20 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-5 mr-2 animate-spin" />
                {t("staff", "processing")}
              </>
            ) : (
              <>
                <Zap className="size-5 mr-2" />
                {t("staff", "addPointsBtn")}
              </>
            )}
          </Button>

          {/* Recent Activity */}
          <div className="mt-6 space-y-3">
            <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide flex items-center gap-2">
              <Clock className="size-4" />
              {t("staff", "recentActivity")}
            </p>
            <div className="space-y-2">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        activity.type === "earn" 
                          ? "bg-[#8b6f47]/10 text-[#8b6f47]" 
                          : "bg-emerald-100 text-emerald-600"
                      }`}>
                        {activity.type === "earn" ? <Coins className="size-4" /> : <Gift className="size-4" />}
                      </div>
                      <span className="text-zinc-600">
                        {activity.type === "earn" ? (
                          <>{language === "zh" ? "为" : "Added"} <span className="font-medium text-zinc-900">{activity.name}</span> {language === "zh" ? "添加" : ""}{" "}
                          <span className="text-[#8b6f47] font-semibold">{activity.points} {t("common", "pts")}</span></>
                        ) : (
                          <>{language === "zh" ? "为" : "Redeemed for"} <span className="font-medium text-zinc-900">{activity.name}</span> {language === "zh" ? "兑换优惠券" : ""}</>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400 text-sm">{activity.time}</span>
                      {activity.type === "earn" && activity.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTargetTxId(activity.id)}
                          className="size-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                          title={t("staff", "staffDelete")}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-zinc-400">
                  {t("staff", "noActivity")}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Redeem Voucher Tab */}
        <TabsContent value="redeem" className="space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-3xl font-bold text-zinc-900">{t("staff", "verifyVoucher")}</h2>
            <p className="text-zinc-500 mt-1">{language === "zh" ? "扫描或输入优惠券代码" : "Scan or enter voucher code"}</p>
          </div>

          {/* Voucher Input Mode Toggle */}
          {voucherStatus === "idle" && (
            <>
              <div className="flex gap-2 justify-center">
                <Button
                  variant={voucherInputMode === "manual" ? "default" : "outline"}
                  onClick={() => { setVoucherInputMode("manual"); stopScanner(); }}
                  className={voucherInputMode === "manual" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
                >
                  <Keyboard className="size-4 mr-2" />
                  {t("staff", "manualInput")}
                </Button>
                <Button
                  variant={voucherInputMode === "qr" ? "default" : "outline"}
                  onClick={() => { setVoucherInputMode("qr"); startScanner("voucher"); }}
                  className={voucherInputMode === "qr" ? "bg-[#8b6f47] hover:bg-[#7a5f3a]" : ""}
                >
                  <QrCode className="size-4 mr-2" />
                  {t("staff", "scanQR")}
                </Button>
              </div>

              {/* QR Scanner for Voucher */}
              {voucherInputMode === "qr" && isScanning && (
                <div className="relative">
                  <div 
                    id="voucher-scanner" 
                    className="w-full aspect-square max-w-sm mx-auto rounded-xl overflow-hidden bg-black"
                  />
                  {!scannerReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-xl">
                      <div className="text-center text-white">
                        <Loader2 className="size-8 animate-spin mx-auto mb-2" />
                        <p>{language === "zh" ? "正在启动相机..." : "Starting camera..."}</p>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={stopScanner}
                    className="absolute top-2 right-2 bg-white/90"
                  >
                    <X className="size-4" />
                  </Button>
                  <p className="text-center text-sm text-zinc-500 mt-2">
                    {language === "zh" ? "将优惠券 QR 码对准相机" : "Point camera at voucher QR code"}
                  </p>
                </div>
              )}

              {/* Manual Voucher Code Input */}
              {voucherInputMode === "manual" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={t("staff", "voucherCodePlaceholder")}
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="h-14 text-lg text-center font-mono bg-zinc-50 border-2 border-zinc-300 rounded-xl placeholder:text-zinc-400 focus-visible:border-[#8b6f47] focus-visible:ring-[#8b6f47]/20 uppercase flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleCaptureOCR("voucher")}
                      disabled={isCapturing}
                      className="h-14 w-14 rounded-xl border-2 border-zinc-300 shrink-0"
                      title="Capture voucher code with camera"
                    >
                      {isCapturing ? <Loader2 className="size-5 animate-spin" /> : <ImageIcon className="size-5" />}
                    </Button>
                  </div>
                </div>
              )}

              {/* Verify Button */}
              <Button
                onClick={handleVerifyVoucher}
                disabled={!voucherCode.trim() || isProcessing}
                className="w-full h-16 text-xl font-bold bg-[#8b6f47] hover:bg-[#7a5f3a] text-white rounded-xl shadow-lg shadow-[#8b6f47]/20 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-5 mr-2 animate-spin" />
                    {t("staff", "verifying")}
                  </>
                ) : (
                  <>
                    <ScanLine className="size-5 mr-2" />
                    {t("staff", "verifyBtn")}
                  </>
                )}
              </Button>
            </>
          )}

          {/* Result Card */}
          {voucherStatus === "valid" && voucherDetails && (
            <div className="rounded-xl p-5 border-2 bg-emerald-50 border-emerald-400">
              <div className="flex items-start gap-4">
                <div className="size-14 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-8 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-emerald-600 text-sm font-medium uppercase tracking-wide">
                    {t("staff", "validVoucher")}
                  </p>
                  <p className="text-2xl font-bold text-zinc-900 truncate">{voucherDetails.name}</p>
                  {voucherDetails.discount_type && (
                    <p className="text-lg font-semibold text-[#8b6f47] mt-1">
                      {voucherDetails.discount_type === "percentage" 
                        ? `${voucherDetails.discount_value}% ${t("common", "off")}`
                        : `RM${voucherDetails.discount_value} ${t("common", "off")}`}
                    </p>
                  )}
                  {voucherDetails.description && (
                    <p className="text-zinc-600 text-sm mt-1">{voucherDetails.description}</p>
                  )}
                  {voucherDetails.customerName && (
                    <p className="text-zinc-500 text-sm mt-2">
                      {t("staff", "customer")}: <span className="font-medium">{voucherDetails.customerName}</span>
                      {voucherDetails.customerPhone && ` (${voucherDetails.customerPhone})`}
                    </p>
                  )}
                  <p className="text-zinc-400 text-xs font-mono mt-2">{voucherCode}</p>
                </div>
              </div>
              
              {/* Redeem Button */}
              <Button
                onClick={handleRedeemVoucher}
                disabled={isProcessing}
                className="w-full h-14 mt-4 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="size-5 mr-2 animate-spin" />
                    {t("staff", "processing")}
                  </>
                ) : (
                  <>
                    <Gift className="size-5 mr-2" />
                    {t("staff", "redeemVoucher")}
                  </>
                )}
              </Button>
            </div>
          )}

          {voucherStatus === "invalid" && (
            <div className="rounded-xl p-5 border-2 bg-red-50 border-red-400">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <XCircle className="size-8 text-red-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-red-600 text-sm font-medium uppercase tracking-wide">
                    {t("staff", "invalidVoucher")}
                  </p>
                  <p className="text-lg text-zinc-600">{voucherDetails?.message || t("staff", "invalidCode")}</p>
                  <p className="text-zinc-500 text-xs font-mono mt-1">{voucherCode}</p>
                </div>
              </div>
            </div>
          )}

          {voucherStatus === "redeemed" && (
            <div className="rounded-xl p-5 border-2 bg-emerald-50 border-emerald-400">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-8 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-emerald-600 text-sm font-medium uppercase tracking-wide">
                    {t("staff", "redeemSuccess")}
                  </p>
                  <p className="text-2xl font-bold text-zinc-900">{voucherDetails?.name}</p>
                  <p className="text-zinc-500 text-sm mt-1">{language === "zh" ? "优惠券已完成兑换" : "Voucher has been redeemed"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reset Button */}
          {voucherStatus !== "idle" && (
            <Button
              onClick={handleResetVoucher}
              variant="outline"
              className="w-full h-14 text-lg font-semibold bg-transparent border-2 border-zinc-300 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 rounded-xl transition-all active:scale-[0.98]"
            >
              <ScanLine className="size-5 mr-2" />
              {t("staff", "verifyAnother")}
            </Button>
          )}

          {/* AI/Personal Vouchers Section */}
          <div className="mt-6 pt-6 border-t border-zinc-200">
            <button
              onClick={() => {
                setShowAIVouchers(!showAIVouchers)
                if (!showAIVouchers) fetchRecentAIVouchers()
              }}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-amber-500" />
                <span className="font-semibold text-zinc-900">{t("staff", "aiVouchers")}</span>
                {recentAIVouchers.length > 0 && (
                  <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">
                    {recentAIVouchers.length}
                  </span>
                )}
              </div>
              <span className="text-zinc-400 text-sm">
                {showAIVouchers ? t("staff", "collapse") : t("staff", "expand")}
              </span>
            </button>
            
            {showAIVouchers && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-zinc-500">
                  {t("staff", "aiVouchersDesc")}
                </p>
                {recentAIVouchers.length > 0 ? (
                  recentAIVouchers.map((v: any) => (
                    <div
                      key={v.id}
                      className="p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-zinc-900 text-sm truncate">
                            {v.voucher?.name || "Voucher"}
                          </p>
                          <p className="text-xs text-zinc-600 mt-0.5">
                            {t("staff", "customer")}: {v.user?.full_name || v.user?.phone || "Unknown"}
                          </p>
                          <p className="font-mono text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded mt-1 inline-block">
                            {v.code}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className="text-lg font-bold text-amber-600">
                            {v.voucher?.discount_type === "percentage" 
                              ? `${v.voucher?.discount_value}%` 
                              : `RM${v.voucher?.discount_value}`}
                          </span>
                          <p className="text-xs text-zinc-500">
                            {new Date(v.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {v.voucher?.ai_reason && (
                        <p className="text-xs text-zinc-500 mt-2 italic">
                          {t("staff", "aiReason")}: {v.voucher.ai_reason}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-zinc-400 text-sm">
                    {t("staff", "noAiVouchers")}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Transaction Dialog */}
      {deleteTargetTxId && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => !isDeletingTx && setDeleteTargetTxId(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="size-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">
                {t("staff", "staffDeletePoints")}
              </h3>
            </div>
            <p className="text-zinc-600 mb-6 text-sm">
              {t("staff", "staffDeletePointsDesc")}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setDeleteTargetTxId(null)}
                disabled={isDeletingTx}
                className="flex-1 h-12 rounded-xl"
              >
                {t("staff", "staffCancel")}
              </Button>
              <Button
                onClick={handleDeleteTransaction}
                disabled={isDeletingTx}
                className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeletingTx ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="size-4 mr-2" />
                    {t("staff", "staffDelete")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowConfirmDialog(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="size-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Confirm Action</h3>
            </div>
            <p className="text-zinc-600 mb-6">{confirmMessage}</p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => { pendingAction?.(); }}
                className="flex-1 h-12 rounded-xl bg-[#8b6f47] hover:bg-[#7a5f3a] text-white"
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
