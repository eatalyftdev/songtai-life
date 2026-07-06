import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface UserProfile {
  uid: string;
  email: string;
  phone: string;
  role: "customer" | "distributor" | "content_editor" | "admin" | "superadmin";
  locale: string;
  mustChangePassword: boolean;
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
  user: AuthUser | null;
  userProfile: UserProfile | null;
  distributorProfile: DistributorProfile | null;
  wallet: Wallet | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
  becomeDistributor: (sponsorCode: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapDistributor(uid: string, row: any): DistributorProfile {
  return {
    uid,
    distributorCode: row.distributorCode,
    sponsorId: row.sponsorId ?? null,
    placementId: row.placementId ?? null,
    rank: row.rank ?? "bronze",
    kycStatus: row.kycStatus ?? "none",
    joinedAt: row.joinedAt,
  };
}

function mapWallet(uid: string, row: any): Wallet {
  return {
    uid,
    balanceXaf: row.balanceXaf ?? 0,
    updatedAt: row.updatedAt,
  };
}

function mapProfile(uid: string, row: any): UserProfile {
  return {
    uid,
    email: row.email,
    phone: row.phone ?? "",
    role: row.role,
    locale: row.locale ?? "fr",
    mustChangePassword: false,
    createdAt: row.createdAt,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [distributorProfile, setDistributorProfile] = useState<DistributorProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const authRes = await fetch("/api/auth/user", { credentials: "include" });
      if (!authRes.ok) {
        setUser(null);
        setUserProfile(null);
        setDistributorProfile(null);
        setWallet(null);
        setLoading(false);
        return;
      }
      const authUser = await authRes.json();
      setUser({
        id: authUser.id,
        email: authUser.email,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        profileImageUrl: authUser.profileImageUrl,
      });

      const profRes = await fetch("/api/profile", { credentials: "include" });
      if (profRes.ok) {
        const { profile, distributor, wallet: walletRow } = await profRes.json();
        setUserProfile(profile ? mapProfile(authUser.id, profile) : null);
        setDistributorProfile(distributor ? mapDistributor(authUser.id, distributor) : null);
        setWallet(walletRow ? mapWallet(authUser.id, walletRow) : null);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = () => {
    window.location.href = "/api/login";
  };

  const logout = () => {
    window.location.href = "/api/logout";
  };

  const becomeDistributor = async (sponsorCode: string) => {
    if (!user) throw new Error("No active authenticated session.");
    setLoading(true);
    try {
      const res = await fetch("/api/become-distributor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sponsorCode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to register as distributor.");
      }
      await refreshProfile();
    } finally {
      setLoading(false);
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
        logout,
        becomeDistributor,
        refreshProfile,
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
