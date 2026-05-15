import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POS (Point of Sale) API Integration - Feed Me POS
 * 
 * This endpoint handles communication with Feed Me POS system.
 * Feed Me Documentation: https://www.feedme.com.my/
 * 
 * Flow:
 * 1. Customer pays at Feed Me POS
 * 2. Feed Me sends webhook to this endpoint
 * 3. System finds customer by phone/email
 * 4. Points automatically added (1 point per RM 1)
 * 5. Customer sees updated points in PWA
 * 
 * Webhook URL to configure in Feed Me: https://your-domain.com/api/pos
 */

// POST: Receive transaction from POS
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Verify POS API key (to be implemented)
    const apiKey = request.headers.get("x-pos-api-key");
    if (!apiKey || apiKey !== process.env.POS_API_KEY) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    /**
     * Expected payload from POS:
     * {
     *   transaction_id: string,      // POS transaction ID
     *   customer_phone: string,      // Customer phone number
     *   customer_email?: string,     // Customer email (optional)
     *   amount: number,              // Transaction amount
     *   items: Array<{               // Items purchased
     *     name: string,
     *     quantity: number,
     *     price: number
     *   }>,
     *   timestamp: string,           // Transaction timestamp
     *   store_id?: string,           // Store identifier
     *   staff_id?: string            // Staff identifier
     * }
     */

    const {
      transaction_id,
      customer_phone,
      customer_email,
      amount,
      items,
      timestamp,
      store_id,
      staff_id,
    } = body;

    // Validate required fields
    if (!transaction_id || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: transaction_id, amount" },
        { status: 400 }
      );
    }

    // Find customer by phone or email
    let customer = null;
    if (customer_phone || customer_email) {
      const query = supabase
        .from("profiles")
        .select("id, points_balance, full_name, visit_count")
        .eq("role", "customer");

      if (customer_phone) {
        query.eq("phone", customer_phone);
      } else if (customer_email) {
        query.eq("email", customer_email);
      }

      const { data, error: customerError } = await query.single();
      if (customerError || !data) {
        return NextResponse.json({
          success: false,
          message: "Customer not found in loyalty system",
          transaction_id,
        });
      }
      customer = data;
    }

    if (!customer) {
      // Customer not found - log for manual processing
      console.log(`[POS] Customer not found: ${customer_phone || customer_email}`);
      return NextResponse.json({
        success: false,
        message: "Customer not found in loyalty system",
        transaction_id,
      });
    }

    // Calculate points (1 point per RM 1)
    const points = Math.floor(amount);

    // Create transaction record
    const { error: txError } = await supabase.from("transactions").insert({
      user_id: customer.id,
      type: "earn",
      points,
      amount,
      reason: `POS Transaction: ${transaction_id}`,
    });

    if (txError) {
      console.error("[POS] Transaction error:", txError);
      return NextResponse.json(
        { error: "Failed to record transaction" },
        { status: 500 }
      );
    }

    // Update customer points
    await supabase
      .from("profiles")
      .update({
        points_balance: customer.points_balance + points,
        visit_count: (customer.visit_count ?? 0) + 1,
        last_visit: new Date().toISOString(),
      })
      .eq("id", customer.id);

    console.log(`[POS] Points added: ${points} to ${customer.full_name}`);

    return NextResponse.json({
      success: true,
      message: "Points added successfully",
      data: {
        transaction_id,
        customer_id: customer.id,
        points_earned: points,
        new_balance: customer.points_balance + points,
      },
    });
  } catch (error) {
    console.error("[POS] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET: Check customer points (for POS display)
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // Verify POS API key
    const apiKey = request.headers.get("x-pos-api-key");
    if (!apiKey || apiKey !== process.env.POS_API_KEY) {
      return NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const email = searchParams.get("email");

    if (!phone && !email) {
      return NextResponse.json(
        { error: "Phone or email required" },
        { status: 400 }
      );
    }

    const query = supabase
      .from("profiles")
      .select("id, full_name, points_balance, visit_count")
      .eq("role", "customer");

    if (phone) {
      query.eq("phone", phone);
    } else if (email) {
      query.eq("email", email);
    }

    const { data: customer, error } = await query.single();

    if (error || !customer) {
      return NextResponse.json({
        found: false,
        message: "Customer not found",
      });
    }

    return NextResponse.json({
      found: true,
      customer: {
        id: customer.id,
        name: customer.full_name,
        points: customer.points_balance,
        visits: customer.visit_count,
      },
    });
  } catch (error) {
    console.error("[POS] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
