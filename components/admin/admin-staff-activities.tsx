"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserPlus, Activity, Users } from "lucide-react"
import { useLanguage } from "@/lib/i18n"

interface StaffActivity {
  id: string
  points: number
  amount: number | null
  reason: string | null
  created_at: string
  staff: { full_name: string } | null
  customer: { full_name: string; phone: string } | null
}

interface AdminStaffActivitiesProps {
  activities: StaffActivity[]
}

export function AdminStaffActivities({ activities }: AdminStaffActivitiesProps) {
  const { t } = useLanguage()

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#8b6f47]" />
          {t("admin", "staffActivities")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("admin", "staffActivitiesDesc")}</p>
      </CardHeader>
      <CardContent>
        {activities && activities.length > 0 ? (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/30 hover:border-[#8b6f47]/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/20">
                    <UserPlus className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      <span className="text-[#8b6f47]">{activity.staff?.full_name || "Staff"}</span>
                      {" "}{t("admin", "addedPointsTo")}{" "}
                      <span className="text-emerald-500">{activity.customer?.full_name || activity.customer?.phone || "Customer"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.reason || "Bill payment"} • {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-emerald-500">
                    +{activity.points} pts
                  </p>
                  {activity.amount && (
                    <p className="text-xs text-muted-foreground">
                      RM {Number(activity.amount).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{t("admin", "noStaffActivities")}</p>
            <p className="text-sm mt-1">{t("admin", "staffActivitiesWillAppear")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
