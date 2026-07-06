import { supabase } from "./supabase";

/**
 * =========================================================================
 * COMMISSION ENGINE - SONGTAI LIFE DIGITAL ECOSYSTEM
 * =========================================================================
 *
 * NOTE TO SYSTEM ARCHITECTS:
 * This module is isolated to handle all MLM commission calculations,
 * unilevel/binary overrides, direct sales volume, and referral payouts.
 *
 * The current implementation employs a PLACEHOLDER formula
 * (Flat 10% Direct Bonus + 5% Sponsor override).
 * In Phase 3, update this function to support the full unilevel un-capped
 * volume plan, binary leg balancing, and generation matches.
 * =========================================================================
 */

interface OrderParams {
  orderId: string;
  purchaserUid: string;
  amountXaf: number;
  pvPoints: number;
}

export async function runCommissionEngine({
  orderId,
  purchaserUid,
  amountXaf,
  pvPoints,
}: OrderParams) {
  try {
    console.log(
      `[CommissionEngine] Initiating calculations for order ${orderId}, user ${purchaserUid}, amount ${amountXaf} XAF`
    );

    // 1. Fetch purchaser's distributor profile
    const { data: purchaserData } = await supabase
      .from("distributors")
      .select("*")
      .eq("id", purchaserUid)
      .maybeSingle();

    if (!purchaserData) {
      console.log(
        `[CommissionEngine] Purchaser ${purchaserUid} is not a distributor. No MLM commissions computed.`
      );
      return { success: false, reason: "Purchaser is not a distributor" };
    }

    const sponsorId = purchaserData.sponsor_id;

    if (!sponsorId) {
      console.log(
        `[CommissionEngine] No sponsor registered for ${purchaserUid}. Direct commissions only.`
      );
    }

    // --- PLACEHOLDER FORMULA ---
    const directBonus = Math.floor(amountXaf * 0.1);
    const sponsorOverride = sponsorId ? Math.floor(amountXaf * 0.05) : 0;

    // 2. Award Direct Bonus via atomic RPC
    await supabase.rpc("increment_wallet_balance", {
      p_user_id: purchaserUid,
      p_amount: directBonus,
    });

    // Log direct commission
    await supabase.from("commissions").insert({
      distributor_id: purchaserUid,
      order_id: orderId,
      type: "direct_bonus",
      level: 0,
      amount_xaf: directBonus,
      status: "completed",
    });

    // Log wallet transaction for purchaser
    await supabase.from("wallet_transactions").insert({
      wallet_id: purchaserUid,
      type: "commission",
      amount_xaf: directBonus,
      reference_id: orderId,
      description: `Direct Volume Reward (10% of Order - ${pvPoints} PV generated)`,
      status: "completed",
    });

    // 3. Award Sponsor Override
    if (sponsorId && sponsorOverride > 0) {
      // Resolve sponsor UID from distributor_code
      const { data: sponsorData } = await supabase
        .from("distributors")
        .select("id")
        .eq("distributor_code", sponsorId)
        .maybeSingle();

      if (sponsorData) {
        const sponsorUid = sponsorData.id;

        await supabase.rpc("increment_wallet_balance", {
          p_user_id: sponsorUid,
          p_amount: sponsorOverride,
        });

        await supabase.from("commissions").insert({
          distributor_id: sponsorUid,
          order_id: orderId,
          type: "sponsor_override",
          level: 1,
          amount_xaf: sponsorOverride,
          status: "completed",
        });

        await supabase.from("wallet_transactions").insert({
          wallet_id: sponsorUid,
          type: "commission",
          amount_xaf: sponsorOverride,
          reference_id: orderId,
          description: `Unilevel Level-1 Override (5% of Downline Order ${orderId})`,
          status: "completed",
        });
      }
    }

    return {
      success: true,
      directBonus,
      sponsorOverride,
      sponsorId,
    };
  } catch (error: any) {
    console.error("[CommissionEngine] Critical error calculating commissions:", error);
    throw error;
  }
}
