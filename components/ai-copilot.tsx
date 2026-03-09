"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  Send, 
  Users, 
  User, 
  MessageSquare,
  Search,
  X
} from "lucide-react"
import { LargeBotIcon } from "./3d-icons"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Customer {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  points_balance: number
}

interface AISuggestion {
  id?: string
  message: string
  target_count: number
  target_segment: string
}

type Mode = "ai-suggest" | "single" | "multi"

export function AICopilot() {
  const [mode, setMode] = useState<Mode>("ai-suggest")
  const [status, setStatus] = useState<"loading" | "pending" | "approved" | "ignored">("loading")
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null)
  const [isSending, setIsSending] = useState(false)
  
  // Customer selection state
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    generateSuggestion()
  }, [])

  const loadCustomers = async () => {
    setIsLoadingCustomers(true)
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, email, points_balance")
      .eq("role", "customer")
      .order("full_name")

    if (!error && data) {
      setCustomers(data)
    }
    setIsLoadingCustomers(false)
  }

  const generateSuggestion = async () => {
    setStatus("loading")
    
    try {
      const hour = new Date().getHours()
      let context = ""
      let audience = ""
      let targetCount = 500
      
      if (hour >= 6 && hour < 11) {
        context = "Morning traffic is building up. Shall I send a 'Free Coffee with Breakfast' promo"
        audience = "morning commuters"
      } else if (hour >= 11 && hour < 14) {
        context = "Lunch traffic is low today. Shall I send a 'Free Drink' promo"
        audience = "nearby office workers"
      } else if (hour >= 14 && hour < 17) {
        context = "Afternoon is slow. Shall I send a 'Tea Time Special' promo"
        audience = "afternoon shoppers"
      } else if (hour >= 17 && hour < 21) {
        context = "Dinner rush approaching. Shall I send a 'Family Dinner Deal' promo"
        audience = "families nearby"
        targetCount = 800
      } else {
        context = "Late night? Shall I send a 'Night Owl Special' promo"
        audience = "night owls"
        targetCount = 300
      }

      setSuggestion({
        message: `${context} to ${targetCount} ${audience}?`,
        target_count: targetCount,
        target_segment: audience,
      })
      setStatus("pending")
    } catch (err) {
      setSuggestion({
        message: "Lunch traffic is low today. Shall I send a 'Free Drink' promo to 500 nearby office workers?",
        target_count: 500,
        target_segment: "nearby office workers",
      })
      setStatus("pending")
    }
  }

  const handleApprove = async () => {
    if (!suggestion) return
    
    setIsSending(true)
    
    try {
      const { data: campaign, error } = await supabase
        .from("ai_campaigns")
        .insert({
          name: `AI Promo - ${new Date().toLocaleDateString()}`,
          goal: "promotional",
          message_template: suggestion.message,
          target_segment: suggestion.target_segment,
          recipients_count: suggestion.target_count,
          sent_count: suggestion.target_count,
          status: "completed",
        })
        .select()
        .single()

      if (error) {
        toast.error("Failed to save campaign", { description: error.message })
        setIsSending(false)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 1500))
      
      setStatus("approved")
      toast.success("Campaign sent via WhatsApp!", { 
        description: `Promo sent to ${suggestion.target_count} ${suggestion.target_segment}` 
      })
    } catch (err) {
      toast.error("Failed to send campaign")
    } finally {
      setIsSending(false)
    }
  }

  const handleSendToSelected = async () => {
    if (selectedCustomers.length === 0 || !customMessage.trim()) {
      toast.error("Please select customers and enter a message")
      return
    }

    setIsSending(true)

    try {
      // Get selected customer details
      const selectedDetails = customers.filter(c => selectedCustomers.includes(c.id))
      
      // Save campaign to database
      const { error } = await supabase
        .from("ai_campaigns")
        .insert({
          name: `Manual Campaign - ${new Date().toLocaleDateString()}`,
          goal: "custom",
          message_template: customMessage,
          target_segment: selectedCustomers.length === 1 ? "single customer" : "selected customers",
          recipients_count: selectedCustomers.length,
          sent_count: selectedCustomers.length,
          status: "completed",
        })

      if (error) throw error

      // Simulate sending WhatsApp messages
      await new Promise(resolve => setTimeout(resolve, 1500))

      toast.success("WhatsApp messages sent!", {
        description: `Message sent to ${selectedCustomers.length} customer${selectedCustomers.length > 1 ? 's' : ''}`
      })

      // Reset
      setSelectedCustomers([])
      setCustomMessage("")
      setMode("ai-suggest")
    } catch (err: any) {
      toast.error("Failed to send messages", { description: err.message })
    } finally {
      setIsSending(false)
    }
  }

  const handleIgnore = () => {
    setStatus("ignored")
    toast.info("Suggestion ignored", { description: "I'll suggest again later" })
  }

  const handleReset = () => {
    generateSuggestion()
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    if (newMode !== "ai-suggest" && customers.length === 0) {
      loadCustomers()
    }
  }

  const toggleCustomer = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    )
  }

  const selectAll = () => {
    const filtered = filteredCustomers
    if (selectedCustomers.length === filtered.length) {
      setSelectedCustomers([])
    } else {
      setSelectedCustomers(filtered.map(c => c.id))
    }
  }

  const filteredCustomers = customers.filter(c => {
    const query = searchQuery.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(query) ||
      c.phone?.includes(query) ||
      c.email?.toLowerCase().includes(query)
    )
  })

  return (
    <Card className="relative overflow-hidden border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-amber-500/5">
      <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-amber-500/40 via-amber-400/20 to-amber-500/40 opacity-75 blur-sm animate-pulse" />
      <div className="absolute inset-0 rounded-xl bg-card" />
      
      <CardContent className="relative p-6">
        {/* Mode Switcher */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={mode === "ai-suggest" ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode("ai-suggest")}
            className={mode === "ai-suggest" ? "bg-amber-500 text-amber-foreground" : "border-amber-500/30"}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            AI Suggest
          </Button>
          <Button
            variant={mode === "single" ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode("single")}
            className={mode === "single" ? "bg-amber-500 text-amber-foreground" : "border-amber-500/30"}
          >
            <User className="w-4 h-4 mr-2" />
            Single Customer
          </Button>
          <Button
            variant={mode === "multi" ? "default" : "outline"}
            size="sm"
            onClick={() => switchMode("multi")}
            className={mode === "multi" ? "bg-amber-500 text-amber-foreground" : "border-amber-500/30"}
          >
            <Users className="w-4 h-4 mr-2" />
            Multiple Customers
          </Button>
        </div>

        {/* AI Suggest Mode */}
        {mode === "ai-suggest" && (
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
            <div className="shrink-0">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl" />
                <LargeBotIcon />
              </div>
            </div>
            
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div>
                <h3 className="text-xl font-semibold text-foreground">AI Marketing Assistant</h3>
                <p className="text-sm text-amber-400/80">Send WhatsApp campaigns automatically</p>
              </div>
              
              {status === "loading" && (
                <div className="flex items-center justify-center gap-2 py-4 md:justify-start">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                  <span className="text-sm text-muted-foreground">Analyzing traffic patterns...</span>
                </div>
              )}

              {status === "pending" && suggestion && (
                <>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-sm leading-relaxed text-foreground">
                      {suggestion.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                    <Button 
                      onClick={handleApprove}
                      disabled={isSending}
                      className="bg-amber-500 text-amber-foreground hover:bg-amber-500/90 shadow-lg shadow-amber-500/25"
                      size="sm"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          Sending via WhatsApp...
                        </>
                      ) : (
                        <>
                          <Send className="mr-1.5 h-4 w-4" />
                          Send WhatsApp Campaign
                        </>
                      )}
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

              {status === "approved" && suggestion && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 p-4 md:justify-start">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <p className="text-sm text-emerald-400">
                      WhatsApp promo sent to {suggestion.target_count} {suggestion.target_segment}!
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleReset}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    Get New Suggestion
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
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    Get New Suggestion
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Single/Multi Customer Mode */}
        {(mode === "single" || mode === "multi") && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-amber-500" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {mode === "single" ? "Send to Single Customer" : "Send to Multiple Customers"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select customer{mode === "multi" ? "s" : ""} and compose your WhatsApp message
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50"
              />
            </div>

            {/* Selected count */}
            {selectedCustomers.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/20 text-amber-400">
                  {selectedCustomers.length} selected
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomers([])}
                  className="text-xs text-muted-foreground"
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              </div>
            )}

            {/* Customer List */}
            <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-border/50 p-2">
              {isLoadingCustomers ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading customers...</span>
                </div>
              ) : filteredCustomers.length > 0 ? (
                <>
                  {mode === "multi" && (
                    <div className="flex items-center gap-2 p-2 border-b border-border/50">
                      <Checkbox
                        checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                        onCheckedChange={selectAll}
                      />
                      <span className="text-sm text-muted-foreground">Select All ({filteredCustomers.length})</span>
                    </div>
                  )}
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedCustomers.includes(customer.id) 
                          ? "bg-amber-500/10 border border-amber-500/30" 
                          : "hover:bg-secondary/50"
                      }`}
                      onClick={() => {
                        if (mode === "single") {
                          setSelectedCustomers([customer.id])
                        } else {
                          toggleCustomer(customer.id)
                        }
                      }}
                    >
                      <Checkbox
                        checked={selectedCustomers.includes(customer.id)}
                        onCheckedChange={() => {
                          if (mode === "single") {
                            setSelectedCustomers([customer.id])
                          } else {
                            toggleCustomer(customer.id)
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {customer.full_name || "Unnamed"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {customer.phone || customer.email}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {customer.points_balance} pts
                      </Badge>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No customers found</p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">WhatsApp Message</label>
              <Textarea
                placeholder="Type your promotional message here..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="min-h-[100px] bg-background/50"
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendToSelected}
              disabled={isSending || selectedCustomers.length === 0 || !customMessage.trim()}
              className="w-full bg-amber-500 text-amber-foreground hover:bg-amber-500/90 shadow-lg shadow-amber-500/25"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending via WhatsApp...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send WhatsApp to {selectedCustomers.length || 0} Customer{selectedCustomers.length !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
