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

  // 使用原子操作 RPC 函数，防止竞态条件
  const { data, error } = await supabase.rpc("add_points_atomic", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_staff_id: staffId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // RPC 返回 JSONB
  const result = data as { success: boolean; points?: number; newBalance?: number; error?: string };
  
  if (!result.success) {
    return { success: false, error: result.error || "Unknown error" };
  }

  return {
    success: true,
    points: result.points,
    newBalance: result.newBalance,
  };
}

export async function redeemVoucher(userId: string, voucherId: string) {
  const supabase = await createClient();

  // 使用原子操作 RPC 函数，防止竞态条件
  // 整个兑换过程在一个数据库事务中完成
  const { data, error } = await supabase.rpc("redeem_voucher_atomic", {
    p_user_id: userId,
    p_voucher_id: voucherId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // RPC 返回 JSONB
  const result = data as { 
    success: boolean; 
    voucher?: string; 
    voucherCode?: string;
    pointsUsed?: number;
    newBalance?: number; 
    error?: string 
  };
  
  if (!result.success) {
    return { success: false, error: result.error || "Unknown error" };
  }

  return {
    success: true,
    voucher: result.voucher,
    voucherCode: result.voucherCode,
    newBalance: result.newBalance,
  };
}
