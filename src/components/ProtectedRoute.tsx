import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ForcePasswordChange from "./auth/ForcePasswordChange";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ("customer" | "distributor" | "content_editor" | "admin" | "superadmin")[];
  fallbackPath?: string;
  addNotification?: (msg: string, type: "success" | "info" | "gold") => void;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  fallbackPath = "/distributor/login",
  addNotification,
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();

  // 1. Prevent any rendering or useEffect flashes during initial auth checks
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center space-y-4">
        <span className="w-12 h-12 border-4 border-emerald-700 border-t-[color:var(--color-gold)] rounded-full animate-spin" />
        <p className="text-stone-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Sovereign Guard Checking Session...
        </p>
      </div>
    );
  }

  // 2. No authenticated user -> redirect directly
  if (!user) {
    return <Navigate to={fallbackPath} replace />;
  }

  // 3. User is authenticated, check role authorization
  if (allowedRoles) {
    if (!userProfile || !allowedRoles.includes(userProfile.role)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // 4. Force password change if flagged on profile
  if (userProfile?.mustChangePassword) {
    return (
      <ForcePasswordChange
        onComplete={() => window.location.reload()}
        addNotification={addNotification ?? (() => {})}
      />
    );
  }

  // 5. Authorized -> render content safely with no flash
  return <>{children}</>;
}
