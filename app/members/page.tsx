import { DashboardHeader } from "@/components/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, Mail, MoreHorizontal } from "lucide-react"

const members = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    role: "Admin",
    department: "Marketing",
    status: "online",
    avatar: "SJ",
  },
  {
    id: 2,
    name: "Michael Chen",
    email: "michael.chen@company.com",
    role: "Manager",
    department: "Sales",
    status: "online",
    avatar: "MC",
  },
  {
    id: 3,
    name: "Emily Davis",
    email: "emily.davis@company.com",
    role: "Member",
    department: "Design",
    status: "offline",
    avatar: "ED",
  },
  {
    id: 4,
    name: "James Wilson",
    email: "james.wilson@company.com",
    role: "Member",
    department: "Development",
    status: "online",
    avatar: "JW",
  },
  {
    id: 5,
    name: "Lisa Anderson",
    email: "lisa.anderson@company.com",
    role: "Manager",
    department: "Analytics",
    status: "away",
    avatar: "LA",
  },
  {
    id: 6,
    name: "Robert Brown",
    email: "robert.brown@company.com",
    role: "Member",
    department: "Marketing",
    status: "online",
    avatar: "RB",
  },
]

export default function MembersPage() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Team Members</h2>
              <p className="text-muted-foreground">Manage your team and permissions</p>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Member
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Card key={member.id} className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={`/placeholder-avatar-${member.id}.jpg`} alt={member.name} />
                          <AvatarFallback className="bg-secondary text-foreground">
                            {member.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <span 
                          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card ${
                            member.status === "online" 
                              ? "bg-emerald-500" 
                              : member.status === "away" 
                              ? "bg-amber-500" 
                              : "bg-muted-foreground"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{member.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.department}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <Badge 
                      variant="secondary"
                      className={
                        member.role === "Admin" 
                          ? "bg-primary/20 text-primary" 
                          : member.role === "Manager"
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {member.role}
                    </Badge>
                    <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
