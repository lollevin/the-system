"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  MessageCircle, 
  X, 
  QrCode, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff,
  Smartphone,
  RotateCcw
} from "lucide-react"
import { toast } from "sonner"

interface WhatsAppStatus {
  status: string
  connected: boolean
  phone: string | null
  qr?: string | null
  message?: string
  qrAge?: number | null
  expiresIn?: number | null
  expired?: boolean
}

export function FloatingWhatsApp() {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [qrCountdown, setQrCountdown] = useState<number | null>(null)
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchQR = useCallback(async () => {
    try {
      const response = await fetch("/api/whatsapp/qr")
      const data = await response.json()
      
      if (data.qr) {
        setQrCode(data.qr)
        const seconds = data.expiresIn != null ? Math.ceil(data.expiresIn / 1000) : 20
        setQrCountdown(Math.max(0, seconds))
      } else if (data.status === "connected") {
        setQrCode(null)
        setQrCountdown(null)
      }
    } catch {
      // Silently handle
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/whatsapp/status")
      const data = await response.json()
      setStatus(data)
      
      if (!data.connected && data.status !== "service_offline" && data.status !== "auth_error" && data.status !== "timeout") {
        fetchQR()
      } else {
        setQrCode(null)
        setQrCountdown(null)
      }
    } catch {
      setStatus({
        status: "error",
        connected: false,
        phone: null,
        message: "Failed to connect to service"
      })
    } finally {
      setLoading(false)
    }
  }, [fetchQR])

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const response = await fetch("/api/whatsapp/disconnect", { method: "POST" })
      if (response.ok) {
        toast.success("WhatsApp disconnected")
        setQrCode(null)
        setQrCountdown(null)
        fetchStatus()
      } else {
        toast.error("Failed to disconnect")
      }
    } catch {
      toast.error("Failed to disconnect")
    } finally {
      setDisconnecting(false)
    }
  }

  const handleRestart = async () => {
    setRestarting(true)
    try {
      const response = await fetch("/api/whatsapp/restart", { method: "POST" })
      const data = await response.json()
      if (data.success) {
        toast.success("WhatsApp restarting, new QR in ~5s...")
        setQrCode(null)
        setQrCountdown(null)
        setTimeout(() => fetchStatus(), 5000)
      } else {
        toast.error(data.message || "Restart failed")
      }
    } catch {
      toast.error("Failed to restart service")
    } finally {
      setRestarting(false)
    }
  }

  // QR countdown timer (visual only)
  useEffect(() => {
    if (qrTimerRef.current) clearInterval(qrTimerRef.current)
    if (qrCountdown != null && qrCountdown > 0) {
      qrTimerRef.current = setInterval(() => {
        setQrCountdown(prev => (prev == null || prev <= 1) ? 0 : prev - 1)
      }, 1000)
    }
    return () => { if (qrTimerRef.current) clearInterval(qrTimerRef.current) }
  }, [qrCountdown != null && qrCountdown > 0])

  // Auto-refresh QR every 10s when panel is open and not connected
  useEffect(() => {
    if (qrRefreshRef.current) clearInterval(qrRefreshRef.current)
    const shouldPoll = isOpen && !status?.connected && !loading &&
      status?.status !== "service_offline" && status?.status !== "auth_error" && status?.status !== "timeout"
    if (shouldPoll) {
      qrRefreshRef.current = setInterval(fetchQR, 3000)
    }
    return () => { if (qrRefreshRef.current) clearInterval(qrRefreshRef.current) }
  }, [isOpen, status?.connected, loading, status?.status, fetchQR])

  // Poll status every 5s when not connected
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => {
      if (!status?.connected) fetchStatus()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus, status?.connected])

  // Expose status globally
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__whatsappConnected = status?.connected ?? false
    }
  }, [status?.connected])

  const isConnected = status?.connected ?? false
  const isOffline =
    status?.status === "service_offline" ||
    status?.status === "auth_error" ||
    status?.status === "timeout" ||
    status?.status === "init_failed" ||
    status?.status === "auth_failure"

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          isConnected 
            ? "bg-green-500 hover:bg-green-600" 
            : "bg-[#25D366] hover:bg-[#20BD5B]"
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6 text-white" />
            <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
              loading ? "bg-yellow-400 animate-pulse" :
              isConnected ? "bg-green-300" : 
              isOffline ? "bg-red-500" :
              "bg-orange-400 animate-pulse"
            }`} />
          </div>
        )}
      </button>

      <div 
        className={`fixed bottom-24 left-6 z-50 w-80 bg-card border border-border rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-left ${
          isOpen 
            ? "scale-100 opacity-100 pointer-events-auto" 
            : "scale-0 opacity-0 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-500" />
            <span className="font-semibold">WhatsApp</span>
          </div>
          {loading ? (
            <Badge variant="secondary" className="text-xs">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Checking...
            </Badge>
          ) : isConnected ? (
            <Badge className="bg-green-500 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
            </Badge>
          ) : isOffline ? (
            <Badge variant="destructive" className="text-xs">
              <WifiOff className="w-3 h-3 mr-1" /> Offline
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              <XCircle className="w-3 h-3 mr-1" /> Not Connected
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Service Offline */}
          {isOffline && (
            <div className="text-center py-4">
              <WifiOff className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-2">
                {status?.status === "auth_error"
                  ? "API key mismatch! Check .env on VPS."
                  : status?.status === "timeout"
                    ? "WhatsApp service not responding"
                    : status?.status === "init_failed"
                      ? "WhatsApp client failed to start (Chromium/puppeteer issue). Click Restart."
                      : status?.status === "auth_failure"
                        ? "Session expired. Click Restart to get a new QR."
                        : "WhatsApp service is not running"}
              </p>
              <Button variant="secondary" size="sm" onClick={handleRestart} disabled={restarting} className="mt-2">
                {restarting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                Restart Service
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && !isOffline && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Connected */}
          {!loading && isConnected && (
            <div className="text-center py-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-3">
                <Wifi className="w-7 h-7 text-green-500" />
              </div>
              <p className="font-medium mb-1">WhatsApp Connected</p>
              {status?.phone && (
                <p className="text-sm text-muted-foreground mb-3">+{status.phone}</p>
              )}
              <p className="text-xs text-muted-foreground mb-4">
                You can now send messages directly to customers
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={fetchStatus} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button variant="destructive" size="sm" className="flex-1" onClick={handleDisconnect} disabled={disconnecting}>
                  {disconnecting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LogOut className="w-4 h-4 mr-1" />}
                  Logout
                </Button>
              </div>
            </div>
          )}

          {/* QR Code */}
          {!loading && !isConnected && !isOffline && (
            <div className="text-center py-2">
              {qrCode ? (
                <>
                  <div className="bg-white p-3 rounded-lg inline-block mb-2">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-44 h-44" />
                  </div>
                  {qrCountdown != null && (
                    <div className="mb-2">
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden mx-8">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            qrCountdown > 10 ? "bg-green-500" : qrCountdown > 5 ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, (qrCountdown / 20) * 100)}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-1 ${qrCountdown <= 5 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                        {qrCountdown > 0 ? `Scan within ${qrCountdown}s — auto-refreshes` : "New QR loading..."}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mb-2">
                    WhatsApp → Settings → Linked Devices → Scan
                  </p>
                  <Button variant="outline" size="sm" onClick={handleRestart} disabled={restarting}>
                    {restarting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                    {restarting ? "Restarting..." : "Restart & New QR"}
                  </Button>
                </>
              ) : (
                <>
                  <QrCode className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">
                    {restarting ? "Restarting service..." : "Generating QR code..."}
                  </p>
                  <Button variant="outline" size="sm" onClick={handleRestart} disabled={restarting}>
                    {restarting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                    Restart & New QR
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer Warning */}
        {!loading && !isOffline && (
          <div className="px-4 pb-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ Use a separate WhatsApp Business number, not your personal one.
              </p>
            </div>
          </div>
        )}
      </div>

      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export async function checkWhatsAppConnected(): Promise<boolean> {
  try {
    const response = await fetch("/api/whatsapp/status")
    const data = await response.json()
    return data.connected === true
  } catch {
    return false
  }
}
