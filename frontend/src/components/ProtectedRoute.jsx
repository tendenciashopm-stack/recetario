import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, adminOnly = false, requireSub = false }) {
  const { user, loading } = useAuth();
  if (loading || user === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/recetas" replace />;
  if (requireSub && user.role !== "admin" && user.subscription_status !== "active")
    return <Navigate to="/suscripcion" replace />;
  return children;
}
