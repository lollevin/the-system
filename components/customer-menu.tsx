"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ChevronLeft, 
  Search, 
  UtensilsCrossed,
  Coffee,
  Cake,
  Sandwich,
  Loader2,
  ImageIcon,
  Soup,
  Baby,
  CupSoda,
  IceCreamCone,
  CakeSlice,
  Flame
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { MenuItem } from "@/lib/supabase/types"
import { useLanguage } from "@/lib/i18n"

interface CustomerMenuProps {
  onBack: () => void
}

const CATEGORY_KEYS: Record<string, string> = {
  all: "catAll",
  brunch: "catBrunch",
  rice_bowl: "catRiceBowls",
  malaysian: "catMalaysian",
  kids: "catKids",
  coffee: "catCoffee",
  drinks: "catDrinks",
  dessert: "catDesserts",
  high_tea: "catHighTea",
}

const CATEGORIES = [
  { value: "all", icon: UtensilsCrossed },
  { value: "brunch", icon: Sandwich },
  { value: "rice_bowl", icon: Soup },
  { value: "malaysian", icon: Flame },
  { value: "kids", icon: Baby },
  { value: "coffee", icon: Coffee },
  { value: "drinks", icon: CupSoda },
  { value: "dessert", icon: IceCreamCone },
  { value: "high_tea", icon: CakeSlice },
]

export function CustomerMenu({ onBack }: CustomerMenuProps) {
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  
  const supabase = createClient()
  const { t } = useLanguage()

  useEffect(() => {
    loadMenu()
  }, [])

  const loadMenu = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("menu_items")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true })

      if (data) setItems(data)
    } catch (err) {
      console.error("Error loading menu:", err)
    } finally {
      setLoading(false)
    }
  }

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
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

  const getCategoryLabel = (category: string) => {
    const key = CATEGORY_KEYS[category]
    return key ? t("customer", key) : category
  }

  const getCategoryIcon = (category: string) => {
    const cat = CATEGORIES.find(c => c.value === category)
    return cat?.icon || UtensilsCrossed
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t("customer", "menu")}</h1>
        </div>
        
        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("customer", "searchMenu")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon
            return (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
                className="shrink-0 gap-1"
              >
                <Icon className="w-4 h-4" />
                {getCategoryLabel(cat.value)}
              </Button>
            )
          })}
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="py-12 text-center">
              <UtensilsCrossed className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-xl font-semibold mb-2">{t("customer", "menuComingSoon")}</h3>
              <p className="text-muted-foreground">
                {t("customer", "menuComingSoonDesc")}
              </p>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="py-12 text-center">
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-lg font-semibold mb-2">{t("customer", "noResults")}</h3>
              <p className="text-muted-foreground">
                {t("customer", "noItemsMatch")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedItems).map(([category, categoryItems]) => {
              const CategoryIcon = getCategoryIcon(category)
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <CategoryIcon className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-lg">{getCategoryLabel(category)}</h2>
                    <Badge variant="secondary">{categoryItems.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {categoryItems.map(item => (
                      <Card key={item.id} className="overflow-hidden">
                        <div className="flex">
                          {/* Image */}
                          <div className="relative w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-muted">
                            {item.image_url ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-muted-foreground opacity-30" />
                              </div>
                            )}
                          </div>
                          
                          {/* Content */}
                          <CardContent className="flex-1 p-3 flex flex-col justify-between">
                            <div>
                              <h3 className="font-semibold">{item.name}</h3>
                              {item.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-lg text-primary">
                                RM {item.price.toFixed(2)}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {getCategoryLabel(item.category)}
                              </Badge>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
