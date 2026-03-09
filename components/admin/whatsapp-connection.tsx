"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Smartphone, 
  QrCode, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff,
  RotateCcw
} from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"

interface WhatsAppStatus {
  status: string
  connected: boolean
  phone: string | null
  qr?: string | null
  message?: string
  qrAge?: number | null
  expiresIn?: number | null
}

export function WhatsAppConnection() {
  const { t } = useLanguage()
  const [status, setStatus] = useState<WhatsAppStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [qrCountdown, setQrCountdown] = useState<number | null>(null)
  const qrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
  }, [])

  const fetchQR = async () => {
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
        fetchStatus()
      }
    } catch {
      // Silently handle
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const response = await fetch("/api/whatsapp/disconnect", { method: "POST" })
      if (response.ok) {
        toast.success(t("common", "success"))
        setQrCode(null)
        setQrCountdown(null)
        fetchStatus()
      } else {
        toast.error(t("common", "error"))
      }
    } catch {
      toast.error(t("common", "error"))
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
        toast.success("WhatsApp service restarting...")
        setQrCode(null)
        setQrCountdown(null)
        setTimeout(() => fetchStatus(), 4000)
      } else {
        toast.error(data.message || "Restart failed")
      }
    } catch {
      toast.error("Failed to restart service")
    } finally {
      setRestarting(false)
    }
  }

  // QR countdown timer
  useEffect(() => {
    if (qrTimerRef.current) clearInterval(qrTimerRef.current)
    if (qrCountdown != null && qrCountdown > 0) {
      qrTimerRef.current = setInterval(() => {
        setQrCountdown(prev => {
          if (prev == null || prev <= 1) return 0
          return prev - 1
        })
      }, 1000)
    }
    return () => { if (qrTimerRef.current) clearInterval(qrTimerRef.current) }
  }, [qrCountdown != null && qrCountdown > 0])

  // Auto-refresh QR every 10s when not connected
  useEffect(() => {
    if (qrRefreshRef.current) clearInterval(qrRefreshRef.current)
    const shouldPoll = !status?.connected && !loading &&
      status?.status !== "service_offline" && status?.status !== "auth_error" && status?.status !== "timeout"
    if (shouldPoll) {
      qrRefreshRef.current = setInterval(fetchQR, 3000)
    }
    return () => { if (qrRefreshRef.current) clearInterval(qrRefreshRef.current) }
  }, [status?.connected, loading, status?.status])

  // Poll status
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => {
      if (!status?.connected) {
        fetchStatus()
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchStatus, status?.connected])

  const getStatusBadge = () => {
    if (loading) {
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 检查中...</Badge>
    }
    if (status?.status === "service_offline" || status?.status === "auth_error" || status?.status === "timeout") {
      return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" /> 服务离线</Badge>
    }
    if (status?.connected) {
      return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> 已连接</Badge>
    }
    if (status?.status === "qr_ready") {
      return <Badge variant="secondary"><QrCode className="w-3 h-3 mr-1" /> 等待扫码</Badge>
    }
    if (status?.status === "connecting") {
      return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> 连接中...</Badge>
    }
    return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" /> 未连接</Badge>
  }

  const isOffline = status?.status === "service_offline" || status?.status === "auth_error" || status?.status === "timeout"

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-green-500" />
              WhatsApp 连接
            </CardTitle>
            <CardDescription className="mt-1">
              扫码登录 WhatsApp 以启用消息发送功能
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Service Offline */}
        {isOffline && (
          <div className="text-center py-8">
            <WifiOff className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              {status?.status === "auth_error"
                ? "API key 不匹配！请检查 VPS 上 WhatsApp 服务的 .env 文件"
                : status?.status === "timeout"
                  ? "WhatsApp 服务无响应（超时）"
                  : "WhatsApp 服务未运行"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {status?.message || "请确保 VPS 上的 WhatsApp 服务已启动"}
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={fetchStatus} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                重试连接
              </Button>
              <Button variant="secondary" onClick={handleRestart} disabled={restarting}>
                {restarting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                重启服务
              </Button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !isOffline && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Connected */}
        {!loading && status?.connected && (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <Wifi className="w-8 h-8 text-green-500" />
            </div>
            <p className="font-medium text-lg mb-1">WhatsApp 已连接</p>
            {status.phone && (
              <p className="text-muted-foreground mb-4">
                +{status.phone}
              </p>
            )}
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={fetchStatus} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                刷新状态
              </Button>
              <Button variant="destructive" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
                断开连接
              </Button>
            </div>
          </div>
        )}

        {/* QR Code */}
        {!loading && !status?.connected && !isOffline && (
          <div className="text-center py-4">
            {qrCode ? (
              <>
                <div className="bg-white p-4 rounded-lg inline-block mb-3">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                </div>
                {qrCountdown != null && (
                  <div className="mb-3">
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden mx-12">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          qrCountdown > 10 ? "bg-green-500" : qrCountdown > 5 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${Math.min(100, (qrCountdown / 20) * 100)}%` }}
                      />
                    </div>
                    <p className={`text-xs mt-1 ${qrCountdown <= 5 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                      {qrCountdown > 0 ? `请在 ${qrCountdown} 秒内扫描 — 自动刷新` : "正在加载新二维码..."}
                    </p>
                  </div>
                )}
                <p className="text-muted-foreground mb-3">
                  打开手机 WhatsApp → 设置 → 关联设备 → 扫描此二维码
                </p>
                <Button variant="outline" size="sm" onClick={handleRestart} disabled={restarting}>
                  {restarting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  {restarting ? "重启中..." : "重启并获取新二维码"}
                </Button>
              </>
            ) : (
              <>
                <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {restarting ? "正在重启服务..." : "正在生成二维码..."}
                </p>
                <Button variant="outline" onClick={handleRestart} disabled={restarting}>
                  {restarting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                  重启并获取新二维码
                </Button>
              </>
            )}
          </div>
        )}

        {/* Warning */}
        {!loading && !isOffline && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              <strong>提醒：</strong>请使用单独的 WhatsApp Business 号码，不要使用私人号码，以避免账号风险。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
