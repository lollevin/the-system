import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

/**
 * Reverses a previously-added `earn` transaction.
 *
 * Only the staff who created the tx (or an admin) can delete it.
 * The action is:
 *  1. Delete the transaction row
 *  2. Subtract the points / amount / visit from the customer profile
 *  3. Write an entry to `staff_activity_log` so admin can audit it.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

    const { transactionId } = await request.json().catch(() => ({ transactionId: null }))
    if (!transactionId) {
      return NextResponse.json({ error: "transactionId required" }, { status: 400 })
    }

    // Caller role
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single()
    const callerRole = callerProfile?.role
    if (callerRole !== "staff" && callerRole !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Load the transaction
    const { data: tx, error: txErr } = await admin
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single()
    if (txErr || !tx) {
      return NextResponse.json({ error: "transaction_not_found" }, { status: 404 })
    }

    // Only the owning staff or any admin may reverse
    if (callerRole !== "admin" && tx.staff_id !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    // Only "earn" transactions can be deleted this way
    if (tx.type !== "earn") {
      return NextResponse.json(
        { error: "only earn transactions can be reversed" },
        { status: 400 }
      )
    }

    const customerId: string = tx.user_id
    const pointsToReverse: number = Number(tx.points) || 0
    const amountToReverse: number = Number(tx.amount) || 0

    // Load customer
    const { data: customer } = await admin
      .from("profiles")
      .select("points_balance, total_spent, visit_count, full_name")
      .eq("id", customerId)
      .single()

    const newPoints = Math.max(0, (customer?.points_balance || 0) - pointsToReverse)
    const newSpent = Math.max(0, (customer?.total_spent || 0) - amountToReverse)
    const newVisits = Math.max(0, (customer?.visit_count || 0) - 1)

    const { error: updateErr } = await admin
      .from("profiles")
      .update({
        points_balance: newPoints,
        total_spent: newSpent,
        visit_count: newVisits,
      })
      .eq("id", customerId)
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Delete the transaction row
    const { error: delErr } = await admin
      .from("transactions")
      .delete()
      .eq("id", transactionId)
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    // Audit log — best effort
    try {
      await admin.from("staff_activity_log").insert({
        staff_id: user.id,
        action_type: "delete_points",
        target_customer_id: customerId,
        details: {
          transaction_id: transactionId,
          points_reversed: pointsToReverse,
          amount_reversed: amountToReverse,
          customer_name: customer?.full_name || null,
          staff_name: callerProfile?.full_name || null,
          original_reason: tx.reason || null,
        },
      })
    } catch (_) {}

    return NextResponse.json({
      success: true,
      points_reversed: pointsToReverse,
      amount_reversed: amountToReverse,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "unknown error" },
      { status: 500 }
    )
  }
}
