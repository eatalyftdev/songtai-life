import { db } from "./firebase";
import { doc, getDoc, updateDoc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * =========================================================================
 * COMMISSION ENGINE - SONGTAI LIFE DIGITAL ECOSYSTEM
 * =========================================================================
 * 
 * NOTE TO SYSTEM ARCHITECTS:
 * This module is isolated to handle all Multi-Level Marketing (MLM) commission calculations,
 * unilevel/binary overrides, direct sales volume, and referral payouts.
 * 
 * The current implementation employs a robust PLACEHOLDER formula (Flat 10% Direct Bonus + 5% Sponsor override).
 * In Phase 3, this function can be safely updated to support the full unilevel un-capped volume plan,
 * binary leg balancing, and generation matches, without impacting any user interface or wallet plumbing.
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
  pvPoints
}: OrderParams) {
  try {
    console.log(`[CommissionEngine] Initiating calculations for order ${orderId}, user ${purchaserUid}, amount ${amountXaf} XAF`);

    // 1. Fetch the purchaser's distributor profile to find their sponsor
    const purchaserDistRef = doc(db, "distributors", purchaserUid);
    const purchaserDistSnap = await getDoc(purchaserDistRef);

    if (!purchaserDistSnap.exists()) {
      console.log(`[CommissionEngine] Purchaser ${purchaserUid} is not a distributor. No MLM commissions computed.`);
      return { success: false, reason: "Purchaser is not a distributor" };
    }

    const purchaserData = purchaserDistSnap.data();
    const sponsorId = purchaserData.sponsorId;

    if (!sponsorId) {
      console.log(`[CommissionEngine] No sponsor registered for ${purchaserUid}. Direct commissions only.`);
    }

    // --- PLACEHOLDER FORMULA ---
    // Rule A: Direct Bonus (10% of order price is credited directly to purchaser's wallet)
    const directBonus = Math.floor(amountXaf * 0.10);
    
    // Rule B: Sponsor Override (5% of order price credited to sponsor's wallet if they exist)
    const sponsorOverride = sponsorId ? Math.floor(amountXaf * 0.05) : 0;

    // 2. Award Direct Bonus
    const purchaserWalletRef = doc(db, "wallets", purchaserUid);
    const purchaserWalletSnap = await getDoc(purchaserWalletRef);
    let purchaserBalance = 0;

    if (purchaserWalletSnap.exists()) {
      purchaserBalance = purchaserWalletSnap.data().balanceXaf || 0;
    }
    
    const newPurchaserBalance = purchaserBalance + directBonus;
    await setDoc(purchaserWalletRef, {
      balanceXaf: newPurchaserBalance,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Create Direct Commission log
    const commCollection = collection(db, "commissions");
    await addDoc(commCollection, {
      distributorId: purchaserUid,
      orderId,
      type: "direct_bonus",
      level: 0,
      amountXaf: directBonus,
      status: "completed",
      createdAt: serverTimestamp()
    });

    // Create wallet transaction log for purchaser
    const txCollection = collection(db, "walletTransactions");
    await addDoc(txCollection, {
      walletId: purchaserUid,
      type: "commission",
      amountXaf: directBonus,
      referenceId: orderId,
      description: `Direct Volume Reward (10% of Order - ${pvPoints} PV generated)`,
      createdAt: serverTimestamp()
    });

    // 3. Award Sponsor Override (if sponsor exists and is active)
    if (sponsorId && sponsorOverride > 0) {
      const sponsorWalletRef = doc(db, "wallets", sponsorId);
      const sponsorWalletSnap = await getDoc(sponsorWalletRef);
      let sponsorBalance = 0;

      if (sponsorWalletSnap.exists()) {
        sponsorBalance = sponsorWalletSnap.data().balanceXaf || 0;
      }

      await setDoc(sponsorWalletRef, {
        balanceXaf: sponsorBalance + sponsorOverride,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Create Sponsor Commission log
      await addDoc(commCollection, {
        distributorId: sponsorId,
        orderId,
        type: "sponsor_override",
        level: 1,
        amountXaf: sponsorOverride,
        status: "completed",
        createdAt: serverTimestamp()
      });

      // Create wallet transaction log for sponsor
      await addDoc(txCollection, {
        walletId: sponsorId,
        type: "commission",
        amountXaf: sponsorOverride,
        referenceId: orderId,
        description: `Unilevel Level-1 Override (5% of Downline Order ${orderId})`,
        createdAt: serverTimestamp()
      });
    }

    return {
      success: true,
      directBonus,
      sponsorOverride,
      sponsorId
    };

  } catch (error: any) {
    console.error("[CommissionEngine] Critical error calculating commissions:", error);
    throw error;
  }
}
