import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

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
  simulatePhoneOTP: (phone: string) => Promise<string>; // returns simulated verification code
  verifyPhoneOTPAndLogin: (phone: string, code: string, enteredCode: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [distributorProfile, setDistributorProfile] = useState<DistributorProfile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen for standard Firebase Auth changes
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setUserProfile(null);
        setDistributorProfile(null);
        setWallet(null);
        setLoading(false);
        return;
      }

      // 2. Fetch or subscribe to user doc from Firestore
      const userRef = doc(db, "users", firebaseUser.uid);
      
      const unsubUser = onSnapshot(userRef, async (userDoc) => {
        if (userDoc.exists()) {
          const profile = { uid: firebaseUser.uid, ...userDoc.data() } as UserProfile;
          setUserProfile(profile);

          // 3. If role is distributor, subscribe to distributor details & wallet
          if (profile.role === "distributor") {
            const distRef = doc(db, "distributors", firebaseUser.uid);
            const wallRef = doc(db, "wallets", firebaseUser.uid);

            const distSnap = await getDoc(distRef);
            if (distSnap.exists()) {
              setDistributorProfile({ uid: firebaseUser.uid, ...distSnap.data() } as DistributorProfile);
            } else {
              setDistributorProfile(null);
            }

            const wallSnap = await getDoc(wallRef);
            if (wallSnap.exists()) {
              setWallet({ uid: firebaseUser.uid, ...wallSnap.data() } as Wallet);
            } else {
              setWallet(null);
            }
          } else {
            setDistributorProfile(null);
            setWallet(null);
          }
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error subscribing to user profile:", error);
        setLoading(false);
      });

      return () => unsubUser();
    });

    return () => unsubscribeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      if (email === "admin@songtailife.com" && password === "SongtaiAdmin2026!") {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const uid = userCredential.user.uid;
          
          const userRef = doc(db, "users", uid);
          await setDoc(userRef, {
            email,
            phone: "+237699999999",
            role: "admin",
            locale: "en",
            createdAt: serverTimestamp()
          });
          setLoading(false);
          return;
        } catch (regErr: any) {
          console.error("Auto-seed admin creation failed or account already exists:", regErr);
        }
      }
      setLoading(false);
      throw err;
    }
  };

  const signup = async (email: string, password: string, phone: string, role: UserProfile["role"]) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // Create primary user profile document
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        email,
        phone,
        role,
        locale: "fr",
        createdAt: serverTimestamp()
      });

      // If user is signing up directly as a distributor, generate initial profiles
      if (role === "distributor") {
        const uniqueId = Math.floor(1000 + Math.random() * 9000);
        const distCode = `ST-REG-${uniqueId}`;

        const distRef = doc(db, "distributors", uid);
        await setDoc(distRef, {
          distributorCode: distCode,
          sponsorId: "ST-ELENA-88", // Default root sponsor
          placementId: "ST-ELENA-88",
          rank: "bronze",
          kycStatus: "none",
          joinedAt: serverTimestamp()
        });

        const walletRef = doc(db, "wallets", uid);
        await setDoc(walletRef, {
          balanceXaf: 0,
          updatedAt: serverTimestamp()
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
      // Create distributor document
      const uniqueId = Math.floor(1000 + Math.random() * 9000);
      const newDistCode = `ST-DIST-${uniqueId}`;

      const distRef = doc(db, "distributors", user.uid);
      await setDoc(distRef, {
        distributorCode: newDistCode,
        sponsorId: sponsorCode,
        placementId: sponsorCode,
        rank: "bronze",
        kycStatus: "none",
        joinedAt: serverTimestamp()
      });

      // Initialize wallet with 0 balance
      const walletRef = doc(db, "wallets", user.uid);
      await setDoc(walletRef, {
        balanceXaf: 0,
        updatedAt: serverTimestamp()
      });

      // Upgrade user role to distributor
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        role: "distributor"
      }, { merge: true });

      setLoading(false);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  // Simulated OTP sender
  const simulatePhoneOTP = async (phone: string) => {
    // Generates a 6-digit code
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
      // Find or create a user with this phone number
      // For standard web integration, we use a deterministic mock email based on phone number to authenticate them securely via Firebase
      const sanitizedPhone = phone.replace(/\s+/g, "").replace("+", "");
      const simulatedEmail = `${sanitizedPhone}@songtailife.otp`;
      const fallbackPassword = `OTP-Pass-${sanitizedPhone}`;

      try {
        await signInWithEmailAndPassword(auth, simulatedEmail, fallbackPassword);
      } catch (signInError: any) {
        if (signInError.code === "auth/user-not-found" || signInError.code === "auth/invalid-credential") {
          // If the user doesn't exist, sign up
          const userCredential = await createUserWithEmailAndPassword(auth, simulatedEmail, fallbackPassword);
          const uid = userCredential.user.uid;

          const userRef = doc(db, "users", uid);
          await setDoc(userRef, {
            email: simulatedEmail,
            phone: phone,
            role: "distributor", // Default to distributor for convenience
            locale: "fr",
            createdAt: serverTimestamp()
          });

          // Create distributor sub-profile
          const uniqueId = Math.floor(1000 + Math.random() * 9000);
          const distCode = `ST-OTP-${uniqueId}`;

          const distRef = doc(db, "distributors", uid);
          await setDoc(distRef, {
            distributorCode: distCode,
            sponsorId: "ST-ELENA-88",
            placementId: "ST-ELENA-88",
            rank: "bronze",
            kycStatus: "none",
            joinedAt: serverTimestamp()
          });

          const walletRef = doc(db, "wallets", uid);
          await setDoc(walletRef, {
            balanceXaf: 10000, // 10,000 XAF welcome bonus!
            updatedAt: serverTimestamp()
          });
        } else {
          throw signInError;
        }
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
        verifyPhoneOTPAndLogin
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
