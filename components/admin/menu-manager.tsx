"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Plus, 
  Edit, 
  Trash2, 
  Image as ImageIcon,
  Loader2,
  Search,
  UtensilsCrossed,
  Coffee,
  Cake,
  Sandwich,
  X,
  Upload,
  Camera
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useLanguage } from "@/lib/i18n"
import type { MenuItem } from "@/lib/supabase/types"

interface MenuManagerProps {
  initialItems: MenuItem[]
}

const CATEGORY_ICONS: Record<string, typeof UtensilsCrossed> = {
  brunch: Sandwich,
  rice_bowl: UtensilsCrossed,
  malaysian: UtensilsCrossed,
  kids: Cake,
  coffee: Coffee,
  drinks: Coffee,
  dessert: Cake,
  high_tea: Cake,
  other: UtensilsCrossed,
}

const CATEGORY_TRANSLATION_KEYS: Record<string, string> = {
  brunch: "mmCatBrunch",
  rice_bowl: "mmCatRiceBowls",
  malaysian: "mmCatMalaysian",
  kids: "mmCatKidsMenu",
  coffee: "mmCatCoffee",
  drinks: "mmCatDrinks",
  dessert: "mmCatDesserts",
  high_tea: "mmCatHighTea",
  other: "mmCatOther",
}

const CATEGORY_VALUES = ["brunch", "rice_bowl", "malaysian", "kids", "coffee", "drinks", "dessert", "high_tea", "other"]

export function MenuManager({ initialItems }: MenuManagerProps) {
  const { t } = useLanguage()
  const [items, setItems] = useState<MenuItem[]>(initialItems)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "brunch",
    image_url: "",
    is_active: true,
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const supabase = createClient()

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t("admin", "mmSelectImage"))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("admin", "mmImageTooLarge"))
      return
    }

    setIsUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Generate unique filename
      const fileExt = file.name.split(".").pop()
      const fileName = `menu_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `menu-images/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("uploads")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (error) {
        // If bucket doesn't exist, try creating it or show helpful error
        if (error.message.includes("Bucket not found")) {
          toast.error(t("admin", "mmStorageError"), {
            description: "Please create 'uploads' bucket in Supabase Storage"
          })
        } else {
          throw error
        }
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(filePath)

      // Verify the URL is accessible (bucket must be public)
      try {
        const testResp = await fetch(urlData.publicUrl, { method: "HEAD" })
        if (!testResp.ok) {
          toast.error("Image uploaded but not accessible", {
            description: "Please make the 'uploads' bucket PUBLIC in Supabase Storage settings"
          })
        }
      } catch {
        // Network error, might still work
      }

      setFormData({ ...formData, image_url: urlData.publicUrl })
      toast.success(t("admin", "mmUploadSuccess"))
    } catch (error: any) {
      console.error("Upload error:", error)
      toast.error(t("admin", "mmUploadFailed"), { description: error.message })
      setImagePreview(null)
    } finally {
      setIsUploading(false)
    }
  }

  // Remove image
  const handleRemoveImage = () => {
    setFormData({ ...formData, image_url: "" })
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      category: "brunch",
      image_url: "",
      is_active: true,
    })
    setEditingItem(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      category: item.category,
      image_url: item.image_url || "",
      is_active: item.is_active,
    })
    setImagePreview(item.image_url || null)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error(t("admin", "mmEnterName"))
      return
    }
    if (!formData.price || isNaN(parseFloat(formData.price))) {
      toast.error(t("admin", "mmEnterPrice"))
      return
    }

    setIsLoading(true)

    try {
      const itemData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        price: parseFloat(formData.price),
        category: formData.category,
        image_url: formData.image_url.trim() || null,
        is_active: formData.is_active,
      }

      if (editingItem) {
        // Update existing item
        const { data, error } = await supabase
          .from("menu_items")
          .update(itemData)
          .eq("id", editingItem.id)
          .select()
          .single()

        if (error) throw error

        setItems(items.map(item => item.id === editingItem.id ? data : item))
        toast.success(t("admin", "mmItemUpdated"))
      } else {
        // Create new item
        const { data, error } = await supabase
          .from("menu_items")
          .insert(itemData)
          .select()
          .single()

        if (error) throw error

        setItems([...items, data])
        toast.success(t("admin", "mmItemAdded"))
      }

      setIsDialogOpen(false)
      resetForm()
    } catch (error: any) {
      console.error("Error:", error)
      toast.error(error.message || t("admin", "mmSaveFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", item.id)

      if (error) throw error

      setItems(items.filter(i => i.id !== item.id))
      toast.success(t("admin", "mmItemDeleted"))
    } catch (error: any) {
      toast.error(error.message || t("admin", "mmDeleteFailed"))
    }
  }

  const handleToggleActive = async (item: MenuItem) => {
    try {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_active: !item.is_active })
        .eq("id", item.id)

      if (error) throw error

      setItems(items.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i))
      toast.success(item.is_active ? t("admin", "mmItemHidden") : t("admin", "mmItemShown"))
    } catch (error: any) {
      toast.error(t("admin", "mmToggleFailed"))
    }
  }

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "all" || item.category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Group by category
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)

  const getCategoryIcon = (category: string) => {
    return CATEGORY_ICONS[category] || UtensilsCrossed
  }

  const getCategoryLabel = (category: string) => {
    const key = CATEGORY_TRANSLATION_KEYS[category]
    return key ? t("admin", key) : category
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("admin", "mmSearchItems")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t("admin", "mmCategory")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin", "mmAllCategories")}</SelectItem>
              {CATEGORY_VALUES.map(value => (
                <SelectItem key={value} value={value}>{getCategoryLabel(value)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              {t("admin", "mmAddItem")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? t("admin", "mmEditItem") : t("admin", "mmAddItem")}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <Label htmlFor="name">{t("admin", "mmItemName")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("admin", "mmItemNamePlaceholder")}
                  required
                />
              </div>

              {/* Category */}
              <div>
                <Label htmlFor="category">{t("admin", "mmCategory")} *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_VALUES.map(value => (
                      <SelectItem key={value} value={value}>{getCategoryLabel(value)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price */}
              <div>
                <Label htmlFor="price">{t("admin", "mmPrice")}</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder={t("admin", "mmPricePlaceholder")}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">{t("admin", "mmDescription")}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t("admin", "mmDescPlaceholder")}
                  rows={3}
                />
              </div>

              {/* Image Upload */}
              <div>
                <Label>{t("admin", "mmFoodImage")}</Label>
                <div className="mt-2">
                  {/* Preview */}
                  {(imagePreview || formData.image_url) ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden bg-muted mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview || formData.image_url}
                        alt="Preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="w-full h-40 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{t("admin", "mmUploading")}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{t("admin", "mmClickUpload")}</span>
                          <span className="text-xs text-muted-foreground">{t("admin", "mmImageSize")}</span>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  
                  {/* Upload button when image exists */}
                  {(imagePreview || formData.image_url) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 gap-2"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Camera className="h-4 w-4" />
                      {t("admin", "mmChangeImage")}
                    </Button>
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("admin", "mmShowOnMenu")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("admin", "mmToggleShow")}
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              {/* Submit */}
              <div className="flex gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  {t("common", "cancel")}
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingItem ? (
                    t("admin", "mmUpdateItem")
                  ) : (
                    t("admin", "mmAddItemBtn")
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-sm text-muted-foreground">{t("admin", "mmTotalItems")}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{items.filter(i => i.is_active).length}</p>
            <p className="text-sm text-muted-foreground">{t("admin", "mmActiveItems")}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{new Set(items.map(i => i.category)).size}</p>
            <p className="text-sm text-muted-foreground">{t("admin", "mmCategories")}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{items.filter(i => !i.is_active).length}</p>
            <p className="text-sm text-muted-foreground">{t("admin", "mmHiddenItems")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Menu Items */}
      {Object.keys(groupedItems).length === 0 ? (
        <Card className="bg-card/50">
          <CardContent className="py-12 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">{t("admin", "mmNoItems")}</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterCategory !== "all" 
                ? t("admin", "mmNoMatch") 
                : t("admin", "mmStartAdding")}
            </p>
            {!searchQuery && filterCategory === "all" && (
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="w-4 h-4" />
                {t("admin", "mmAddFirst")}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, categoryItems]) => {
            const CategoryIcon = getCategoryIcon(category)
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-lg">{getCategoryLabel(category)}</h3>
                  <Badge variant="secondary">{categoryItems.length}</Badge>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryItems.map(item => (
                    <Card 
                      key={item.id} 
                      className={`bg-card/50 overflow-hidden ${!item.is_active ? 'opacity-60' : ''}`}
                    >
                      {/* Image */}
                      <div className="relative h-32 bg-muted">
                        {item.image_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-8 h-8 text-muted-foreground opacity-50" />
                          </div>
                        )}
                        {!item.is_active && (
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary">{t("admin", "mmHidden")}</Badge>
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">{item.name}</h4>
                          <span className="font-bold text-amber-500">
                            RM {item.price.toFixed(2)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => openEditDialog(item)}
                            className="flex-1 gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            {t("common", "edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleActive(item)}
                          >
                            {item.is_active ? t("admin", "mmHide") : t("admin", "mmShow")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
