import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface UserProfile {
  uid: string;
  email: string;
  phone: string;
  role: "customer" | "distributor" | "content_editor" | "admin" | "superadmin";
  locale: string;
  createdAt: any;
}

export interface DistributorProfile {
  uid: string;
  distributorCode: string;
  sponsorId: string | null;
  placementId: string | null;
  rank: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  kycStatus: "none" | "pending" | "verified" | "rejected";
  joinedAt: any;
}

export interface Wallet {
  uid: string;
  balanceXaf: number;
  updatedAt: any;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  distributorProfile: DistributorProfile | null;
  wallet: Wallet | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, phone: string, role: UserProfile["role"]) => Promise<void>;
  becomeDistributor: (sponsorCode: string) => Promise<void>;
  logout: () => Promise<void>;
  simulatePhoneOTP: (phone: string) => Promise<string>;
  verifyPhoneOTPAndLogin: (phone: string, code: string, enteredCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map Supabase snake_case row → camelCase DistributorProfile
function mapDistributor(uid: string, row: any): DistributorProfile {
  return {
    uid,
    distributorCode: row.distributor_code,
    sponsorId: row.sponsor_id ?? null,
    placementId: row.placement_id ?? null,
    rank: row.rank ?? "bronze",
    kycStatus: row.kyc_status ?? "none",
    joinedAt: row.joined_at,
  };
}

// Map Supabase snake_case row → camelCase Wallet
function mapWallet(uid: string, row: any): Wallet {
  return {
    uid,
    balanceXaf: row.balance_xaf ?? 0,
    updatedAt: row.updated_at,
  };
}

// Map Supabase snake_case row → camelCase UserProfile
function mapProfile(uid: string, row: any): UserProfile {
  return {
    uid,
    email: row.email,
    phone: row.phone ?? "",
    role: row.role,
    locale: row.locale ?? "fr",
    createdAt: row.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [distributorProfile, setDistributorProfile] = useState<DistributorProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch distributor and wallet for a given uid
  async function fetchDistributorData(uid: string) {
    const [distRes, walletRes] = await Promise.all([
      supabase.from("distributors").select("*").eq("id", uid).maybeSingle(),
      supabase.from("wallets").select("*").eq("id", uid).maybeSingle(),
    ]);
    setDistributorProfile(distRes.data ? mapDistributor(uid, distRes.data) : null);
    setWallet(walletRes.data ? mapWallet(uid, walletRes.data) : null);
  }

  useEffect(() => {
    // Auth state listener
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const supabaseUser = session?.user ?? null;
        setUser(supabaseUser);

        if (!supabaseUser) {
          setUserProfile(null);
          setDistributorProfile(null);
          setWallet(null);
          setLoading(false);
          return;
        }

        // Fetch profile from Supabase
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", supabaseUser.id)
          .maybeSingle();

        if (profileRow) {
          const profile = mapProfile(supabaseUser.id, profileRow);
          setUserProfile(profile);
          if (profile.role === "distributor") {
            await fetchDistributorData(supabaseUser.id);
          } else {
            setDistributorProfile(null);
            setWallet(null);
          }
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    return () => authSub.unsubscribe();
  }, []);

  // Realtime: keep wallet + distributor live after auth is established
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-data-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        async () => {
          const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
          if (data) {
            const profile = mapProfile(user.id, data);
            setUserProfile(profile);
            if (profile.role === "distributor") {
              await fetchDistributorData(user.id);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `id=eq.${user.id}` },
        async () => {
          const { data } = await supabase.from("wallets").select("*").eq("id", user.id).maybeSingle();
          if (data) setWallet(mapWallet(user.id, data));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Admin bootstrap: auto-create admin account on first login attempt
        if (email === "admin@songtailife.com" && password === "SongtaiAdmin2026!") {
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({ email, password });
          if (signUpErr) throw signUpErr;
          if (signUpData.user) {
            await supabase.from("profiles").upsert({
              id: signUpData.user.id,
              email,
              phone: "+237699999999",
              role: "admin",
              locale: "en",
            });
          }
          setLoading(false);
          return;
        }
        setLoading(false);
        throw error;
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signup = async (email: string, password: string, phone: string, role: UserProfile["role"]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      const uid = data.user!.id;

      await supabase.from("profiles").upsert({
        id: uid,
        email,
        phone,
        role,
        locale: "fr",
      });

      if (role === "distributor") {
        const uniqueId = Math.floor(1000 + Math.random() * 9000);
        const distCode = `ST-REG-${uniqueId}`;

        await supabase.from("distributors").upsert({
          id: uid,
          distributor_code: distCode,
          sponsor_id: "ST-ELENA-88",
          placement_id: "ST-ELENA-88",
          rank: "bronze",
          kyc_status: "none",
        });

        await supabase.from("wallets").upsert({
          id: uid,
          balance_xaf: 0,
        });
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const becomeDistributor = async (sponsorCode: string) => {
    if (!user || !userProfile) throw new Error("No active authenticated session.");
    setLoading(true);
    try {
      const uniqueId = Math.floor(1000 + Math.random() * 9000);
      const newDistCode = `ST-DIST-${uniqueId}`;

      await supabase.from("distributors").upsert({
        id: user.id,
        distributor_code: newDistCode,
        sponsor_id: sponsorCode,
        placement_id: sponsorCode,
        rank: "bronze",
        kyc_status: "none",
      });

      await supabase.from("wallets").upsert({
        id: user.id,
        balance_xaf: 0,
      });

      await supabase.from("profiles").update({ role: "distributor" }).eq("id", user.id);

      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const simulatePhoneOTP = async (phone: string): Promise<string> => {
    const mockCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[SMS-OTP-GATEWAY] Sending verification code ${mockCode} to ${phone}`);
    return mockCode;
  };

  const verifyPhoneOTPAndLogin = async (phone: string, code: string, enteredCode: string) => {
    if (code !== enteredCode) {
      throw new Error("Invalid verification code. Please request a new OTP code.");
    }
    setLoading(true);
    try {
      const sanitizedPhone = phone.replace(/\s+/g, "").replace("+", "");
      const simulatedEmail = `${sanitizedPhone}@songtailife.otp`;
      const fallbackPassword = `OTP-Pass-${sanitizedPhone}`;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: simulatedEmail,
        password: fallbackPassword,
      });

      if (signInError) {
        // User doesn't exist — sign up
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: simulatedEmail,
          password: fallbackPassword,
        });
        if (signUpErr) throw signUpErr;

        const uid = signUpData.user!.id;
        const uniqueId = Math.floor(1000 + Math.random() * 9000);
        const distCode = `ST-OTP-${uniqueId}`;

        await supabase.from("profiles").upsert({
          id: uid,
          email: simulatedEmail,
          phone,
          role: "distributor",
          locale: "fr",
        });

        await supabase.from("distributors").upsert({
          id: uid,
          distributor_code: distCode,
          sponsor_id: "ST-ELENA-88",
          placement_id: "ST-ELENA-88",
          rank: "bronze",
          kyc_status: "none",
        });

        await supabase.from("wallets").upsert({
          id: uid,
          balance_xaf: 10000, // Welcome bonus
        });
      }
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        distributorProfile,
        wallet,
        loading,
        login,
        signup,
        becomeDistributor,
        logout,
        simulatePhoneOTP,
        verifyPhoneOTPAndLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
