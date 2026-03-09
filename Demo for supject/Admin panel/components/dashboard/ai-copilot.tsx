"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2 } from "lucide-react"
import { LargeBotIcon } from "./3d-icons"

export function AICopilot() {
  const [status, setStatus] = useState<"pending" | "approved" | "ignored">("pending")

  const handleApprove = () => setStatus("approved")
  const handleIgnore = () => setStatus("ignored")
  const handleReset = () => setStatus("pending")

  return (
    <Card className="relative overflow-hidden border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-amber-500/5">
      {/* Animated glowing border effect */}
      <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-amber-500/40 via-amber-400/20 to-amber-500/40 opacity-75 blur-sm animate-pulse" />
      <div className="absolute inset-0 rounded-xl bg-card" />
      
      <CardContent className="relative p-6">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
          {/* 3D Bot Icon */}
          <div className="shrink-0">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl" />
              <LargeBotIcon />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 space-y-4 text-center md:text-left">
            <div>
              <h3 className="text-xl font-semibold text-foreground">AI Marketing Assistant</h3>
              <p className="text-sm text-amber-400/80">Powered by intelligent automation</p>
            </div>
            
            {status === "pending" && (
              <>
                {/* AI Message Bubble */}
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <p className="text-sm leading-relaxed text-foreground">
                    Lunch traffic is low today. Shall I send a &quot;Free Drink&quot; promo to 500 nearby office workers?
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                  <Button 
                    onClick={handleApprove}
                    className="bg-amber-500 text-amber-foreground hover:bg-amber-500/90 shadow-lg shadow-amber-500/25"
                    size="sm"
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Approve & Send
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-amber-500/30 text-foreground hover:bg-amber-500/10 bg-transparent"
                  >
                    Edit Message
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleIgnore}
                  >
                    Ignore
                  </Button>
                </div>
              </>
            )}

            {status === "approved" && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 p-4 md:justify-start">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <p className="text-sm text-emerald-400">
                    Promo sent to 500 nearby office workers!
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Reset Demo
                </Button>
              </div>
            )}

            {status === "ignored" && (
              <div className="space-y-3">
                <div className="rounded-lg bg-secondary/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Suggestion ignored. I&apos;ll monitor and suggest again if conditions change.
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Reset Demo
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
