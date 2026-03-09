"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Users, Edit, Trash2, Loader2, Eye, EyeOff, Copy, Check, RefreshCw, Key, AlertTriangle, UserMinus, UserX } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { Profile } from "@/lib/supabase/types"

interface StaffManagerProps {
  initialStaff: Profile[]
}

export function StaffManager({ initialStaff }: StaffManagerProps) {
  const [staff, setStaff] = useState<Profile[]>(initialStaff)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{email: string, password: string} | null>(null)
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "staff" as "staff" | "admin",
    password: "",
  })

  const supabase = createClient()

  // Generate random password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
    let password = ""
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password + "Aa1!" // Ensure it meets complexity requirements
  }

  const resetForm = () => {
    setFormData({
      full_name: "",
      email: "",
      phone: "",
      role: "staff",
      password: generatePassword(),
    })
    setEditingStaff(null)
    setCreatedCredentials(null)
    setShowPassword(false)
    setPasswordCopied(false)
  }

  const openCreateDialog = () => {
    resetForm()
    setFormData(prev => ({ ...prev, password: generatePassword() }))
    setIsDialogOpen(true)
  }

  const openEditDialog = (member: Profile) => {
    setEditingStaff(member)
    setFormData({
      full_name: member.full_name || "",
      email: member.email || "",
      phone: member.phone || "",
      role: member.role as "staff" | "admin",
      password: "",
    })
    setCreatedCredentials(null)
    setIsDialogOpen(true)
  }

  const copyToClipboard = async (text: string) => {
    const { copyToClipboard: safeCopy } = await import("@/lib/utils")
    await safeCopy(text)
    setPasswordCopied(true)
    setTimeout(() => setPasswordCopied(false), 2000)
    toast.success("Copied!")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      if (editingStaff) {
        // Update existing staff
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            role: formData.role,
          })
          .eq("id", editingStaff.id)

        if (error) throw error

        setStaff(prev => prev.map(s => 
          s.id === editingStaff.id 
            ? { ...s, full_name: formData.full_name, phone: formData.phone, role: formData.role }
            : s
        ))
        toast.success("Staff updated successfully")
      } else {
        // Create new staff account
        // Use custom password or generate one
        const password = formData.password || generatePassword()
        const email = formData.email || `staff${Date.now()}@jpco-staff.com`
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: formData.full_name,
              phone: formData.phone,
            },
          },
        })

        if (authError) throw authError

        if (authData.user) {
          // Update profile with staff role and store password for display
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              full_name: formData.full_name,
              phone: formData.phone,
              role: formData.role,
              notes: `pwd:${password}`, // Store password in notes field for admin reference
            })
            .eq("id", authData.user.id)

          if (profileError) throw profileError

          // Fetch updated profile
          const { data: newProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authData.user.id)
            .single()

          if (newProfile) {
            setStaff(prev => [newProfile, ...prev])
          }

          // Show credentials in dialog instead of closing
          setCreatedCredentials({ email, password })
          toast.success("Staff 账号创建成功！")
          return // Don't close dialog yet
        }
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error: any) {
      toast.error(error.message || "Operation failed")
    } finally {
      setIsLoading(false)
    }
  }

  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; member: Profile | null }>({ 
    open: false, 
    member: null 
  })
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Reset password dialog
  const [resetPasswordDialog, setResetPasswordDialog] = useState<{ open: boolean; member: Profile | null }>({
    open: false,
    member: null
  })
  const [newPassword, setNewPassword] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const openResetPasswordDialog = (member: Profile) => {
    setResetPasswordDialog({ open: true, member })
    setNewPassword(generatePassword())
    setResetSuccess(false)
  }

  const handleResetPassword = async () => {
    if (!resetPasswordDialog.member || !newPassword) return
    
    setIsResetting(true)
    try {
      const response = await fetch("/api/admin/reset-staff-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: resetPasswordDialog.member.id,
          newPassword 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "重置失败")
      }

      // Update local state with new password
      setStaff(prev => prev.map(s => 
        s.id === resetPasswordDialog.member!.id 
          ? { ...s, notes: `pwd:${newPassword}` }
          : s
      ))

      setResetSuccess(true)
      toast.success("密码已重置")
    } catch (error: any) {
      toast.error(error.message || "重置失败")
    } finally {
      setIsResetting(false)
    }
  }

  const handleDelete = async (deleteType: "soft" | "hard") => {
    if (!deleteDialog.member) return
    
    setIsDeleting(true)
    try {
      const response = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: deleteDialog.member.id,
          deleteType 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "删除失败")
      }

      setStaff(prev => prev.filter(s => s.id !== deleteDialog.member!.id))
      toast.success(data.message)
      setDeleteDialog({ open: false, member: null })
    } catch (error: any) {
      toast.error(error.message || "删除失败")
    } finally {
      setIsDeleting(false)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "ST"
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  // Get online/activity status based on last_visit
  const getStatus = (lastVisit: string | null) => {
    if (!lastVisit) return "offline"
    const hoursSinceVisit = (Date.now() - new Date(lastVisit).getTime()) / (1000 * 60 * 60)
    if (hoursSinceVisit < 24) return "online"
    if (hoursSinceVisit < 72) return "away"
    return "offline"
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Team Members</h2>
          <p className="text-muted-foreground">Manage your staff and administrators</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2 bg-[#A17755] hover:bg-[#8A6548] text-white">
              <Plus className="h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                {editingStaff ? "Edit Staff" : createdCredentials ? "账号创建成功" : "Add New Staff"}
              </DialogTitle>
              {!editingStaff && !createdCredentials && (
                <DialogDescription>
                  创建员工账号后请记录登录信息
                </DialogDescription>
              )}
            </DialogHeader>

            {/* Show credentials after creation */}
            {createdCredentials ? (
              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                  <p className="text-sm text-green-500 font-medium mb-3">
                    ✓ 员工账号已创建！请保存以下登录信息：
                  </p>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">登录邮箱</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          value={createdCredentials.email} 
                          readOnly 
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(createdCredentials.email)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-muted-foreground text-xs">登录密码</Label>
                      <div className="flex items-center gap-2">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          value={createdCredentials.password} 
                          readOnly 
                          className="font-mono text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(createdCredentials.password)}
                        >
                          {passwordCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const text = `员工登录信息\n邮箱: ${createdCredentials.email}\n密码: ${createdCredentials.password}`
                    copyToClipboard(text)
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  复制全部信息
                </Button>

                <Button 
                  onClick={() => {
                    setIsDialogOpen(false)
                    resetForm()
                  }}
                  className="w-full bg-[#A17755] hover:bg-[#8A6548] text-white"
                >
                  完成
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="bg-background/50"
                    required
                  />
                </div>

                {!editingStaff && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email (登录用)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="staff@jpco.com"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-background/50"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password (登录密码)</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="设置登录密码"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            className="bg-background/50 pr-10"
                            required
                            minLength={6}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setFormData(prev => ({ ...prev, password: generatePassword() }))}
                          title="生成随机密码"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        至少6位字符，建议包含字母和数字
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+60 12 345 6789"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "staff" | "admin") => setFormData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className="flex-1 bg-[#A17755] hover:bg-[#8A6548] text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingStaff ? "Updating..." : "Creating..."}
                      </>
                    ) : (
                      editingStaff ? "Update" : "Create"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {staff && staff.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff.map((member) => {
            const status = getStatus(member.last_visit)
            const initials = getInitials(member.full_name)

            return (
              <Card key={member.id} className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-secondary text-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span 
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                            status === "online" 
                              ? "bg-emerald-500" 
                              : status === "away" 
                              ? "bg-amber-500" 
                              : "bg-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{member.full_name || "Unnamed"}</h3>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {member.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Phone</span>
                        <span className="text-sm font-medium text-foreground">{member.phone}</span>
                      </div>
                    )}
                    {/* Show password if stored in notes */}
                    {member.notes?.startsWith("pwd:") && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Password</span>
                        <div className="flex items-center gap-1">
                          <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                            {member.notes.replace("pwd:", "")}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => {
                              import("@/lib/utils").then(({ copyToClipboard: safeCopy }) => safeCopy(member.notes?.replace("pwd:", "") || ""))
                              toast.success("Password copied!")
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Active</span>
                      <span className="text-sm text-foreground">
                        {member.last_visit 
                          ? new Date(member.last_visit).toLocaleDateString()
                          : "Never"
                        }
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <Badge 
                      variant="secondary"
                      className={
                        member.role === "admin" 
                          ? "bg-[#A17755]/20 text-[#A17755]" 
                          : "bg-secondary text-secondary-foreground"
                      }
                    >
                      {member.role === "admin" ? "Admin" : "Staff"}
                    </Badge>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1 text-muted-foreground hover:text-foreground"
                        onClick={() => openEditDialog(member)}
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                        onClick={() => openResetPasswordDialog(member)}
                        title="重置密码"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => setDeleteDialog({ open: true, member })}
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No staff members yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your first staff member to get started
            </p>
            <Button 
              className="mt-4 gap-2 bg-[#A17755] hover:bg-[#8A6548] text-white"
              onClick={openCreateDialog}
            >
              <Plus className="h-4 w-4" />
              Add Staff
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, member: open ? deleteDialog.member : null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              删除员工
            </DialogTitle>
            <DialogDescription>
              选择如何处理 <span className="font-semibold text-foreground">{deleteDialog.member?.full_name}</span> 的账号
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {/* Option 1: Demote to Customer */}
            <button
              onClick={() => handleDelete("soft")}
              disabled={isDeleting}
              className="w-full p-4 rounded-lg border border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-500/20">
                  <UserMinus className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">降级为客户</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    移除员工权限，账号转为普通客户。可以保留消费记录。
                  </p>
                </div>
              </div>
            </button>

            {/* Option 2: Complete Delete */}
            <button
              onClick={() => handleDelete("hard")}
              disabled={isDeleting}
              className="w-full p-4 rounded-lg border border-red-500/30 hover:border-red-500 hover:bg-red-500/5 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-red-500/20">
                  <UserX className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-500">完全删除</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    彻底删除账号和所有相关数据。此操作不可恢复！
                  </p>
                </div>
              </div>
            </button>
          </div>

          {isDeleting && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">处理中...</span>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, member: null })}
              disabled={isDeleting}
            >
              取消
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog 
        open={resetPasswordDialog.open} 
        onOpenChange={(open) => {
          setResetPasswordDialog({ open, member: open ? resetPasswordDialog.member : null })
          if (!open) {
            setResetSuccess(false)
            setNewPassword("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              重置密码
            </DialogTitle>
            <DialogDescription>
              为 <span className="font-semibold text-foreground">{resetPasswordDialog.member?.full_name}</span> 设置新密码
            </DialogDescription>
          </DialogHeader>

          {resetSuccess ? (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <p className="text-sm text-green-500 font-medium mb-3">
                  ✓ 密码已重置！请保存新的登录信息：
                </p>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">登录邮箱</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={resetPasswordDialog.member?.email || ""} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(resetPasswordDialog.member?.email || "")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-xs">新密码</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        value={newPassword} 
                        readOnly 
                        className="font-mono text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(newPassword)}
                      >
                        {passwordCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  const text = `员工登录信息\n邮箱: ${resetPasswordDialog.member?.email}\n新密码: ${newPassword}`
                  copyToClipboard(text)
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                复制全部信息
              </Button>

              <Button 
                onClick={() => {
                  setResetPasswordDialog({ open: false, member: null })
                  setResetSuccess(false)
                }}
                className="w-full bg-[#A17755] hover:bg-[#8A6548] text-white"
              >
                完成
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>新密码</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="输入新密码"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pr-10"
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNewPassword(generatePassword())}
                    title="生成随机密码"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">至少6位字符</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPasswordDialog({ open: false, member: null })}
                  className="flex-1"
                  disabled={isResetting}
                >
                  取消
                </Button>
                <Button 
                  onClick={handleResetPassword}
                  disabled={isResetting || newPassword.length < 6}
                  className="flex-1 bg-[#A17755] hover:bg-[#8A6548] text-white"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      重置中...
                    </>
                  ) : (
                    "重置密码"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
