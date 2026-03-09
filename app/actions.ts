"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return profile;
}

export async function addPoints(
  userId: string,
  amount: number,
  reason: string,
  staffId: string
) {
  const supabase = await createClient();

  // Calculate points (1 point per RM 1)
  const points = Math.floor(amount);

  // Insert transaction
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: userId,
    staff_id: staffId,
    type: "earn",
    points,
    amount,
    reason,
  });

  if (txError) {
    return { success: false, error: txError.message };
  }

  // Get current balance
  const { data: profile } = await supabase
    .from("profiles")
    .select("points_balance, total_spent, visit_count")
    .eq("id", userId)
    .single();

  if (!profile) {
    return { success: false, error: "User not found" };
  }

  // Update user profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      points_balance: profile.points_balance + points,
      total_spent: profile.total_spent + amount,
      visit_count: profile.visit_count + 1,
      last_visit: new Date().toISOString(),
    })
    .eq("id", userId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return {
    success: true,
    points,
    newBalance: profile.points_balance + points,
  };
}

export async function redeemVoucher(userId: string, voucherId: string) {
  const supabase = await createClient();

  // Get voucher details
  const { data: voucher } = await supabase
    .from("vouchers")
    .select("*")
    .eq("id", voucherId)
    .single();

  if (!voucher) {
    return { success: false, error: "Voucher not found" };
  }

  if (!voucher.is_active) {
    return { success: false, error: "Voucher is not active" };
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("points_balance")
    .eq("id", userId)
    .single();

  if (!profile) {
    return { success: false, error: "User not found" };
  }

  if (profile.points_balance < voucher.points_cost) {
    return { success: false, error: "Insufficient points" };
  }

  // Create user voucher record
  const { error: voucherError } = await supabase.from("user_vouchers").insert({
    user_id: userId,
    voucher_id: voucherId,
  });

  if (voucherError) {
    return { success: false, error: voucherError.message };
  }

  // Deduct points and record transaction
  const { error: txError } = await supabase.from("transactions").insert({
    user_id: userId,
    type: "redeem",
    points: voucher.points_cost,
    reason: `Redeemed: ${voucher.name}`,
  });

  if (txError) {
    return { success: false, error: txError.message };
  }

  // Update user points
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      points_balance: profile.points_balance - voucher.points_cost,
    })
    .eq("id", userId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return {
    success: true,
    voucher: voucher.name,
    newBalance: profile.points_balance - voucher.points_cost,
  };
}
