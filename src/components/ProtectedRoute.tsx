import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ("customer" | "distributor" | "content_editor" | "admin" | "superadmin")[];
  fallbackPath?: string;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  fallbackPath = "/distributor/login"
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();

  // 1. Prevent any rendering or useEffect flashes during initial auth checks
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center space-y-4">
        <span className="w-12 h-12 border-4 border-[#0A7D32] border-t-[#ecc246] rounded-full animate-spin" />
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
      // Redirect to unauthorized display or login
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // 4. Authorized -> render content safely with no flash
  return <>{children}</>;
}
