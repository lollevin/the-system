import { createClient } from "@/lib/supabase/server";
import { RewardsManager } from "./rewards-manager";

export default async function RewardsPage() {
  const supabase = await createClient();

  const { data: vouchers } = await supabase
    .from("vouchers")
    .select("*, target_customer:profiles!vouchers_target_customer_id_fkey(id, full_name, phone)")
    .order("created_at", { ascending: false });

  // Fetch customers for personal voucher creation
  const { data: customers } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("role", "customer")
    .order("full_name");

  return <RewardsManager initialVouchers={vouchers || []} customers={customers || []} />;
}
