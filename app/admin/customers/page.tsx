import { createClient } from "@/lib/supabase/server";
import { StaffManager } from "./staff-manager";

export default async function StaffPage() {
  const supabase = await createClient();

  const { data: staffMembers } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["staff", "admin"])
    .order("created_at", { ascending: false });

  return <StaffManager initialStaff={staffMembers || []} />;
}
