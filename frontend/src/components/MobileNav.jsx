import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Home, UtensilsCrossed, CalendarDays, ShoppingCart, BarChart3, CreditCard, Droplets, ShieldCheck } from "lucide-react";

export function MobileNav() {
  const { user } = useAuth();
  const location = useLocation();
  const memberActive = user && (user.role === "admin" || user.subscription_status === "active");

  let links;
  if (memberActive) {
    links = [
      { to: "/", label: "Inicio", icon: Home },
      { to: "/recetas", label: "Recetas", icon: UtensilsCrossed },
      { to: "/mi-menu", label: "Menú", icon: CalendarDays },
      { to: "/compras", label: "Compras", icon: ShoppingCart },
      { to: user.role === "admin" ? "/admin" : "/bienestar", label: user.role === "admin" ? "Admin" : "Bienestar", icon: user.role === "admin" ? ShieldCheck : Droplets },
    ];
  } else if (user) {
    links = [
      { to: "/", label: "Inicio", icon: Home },
      { to: "/recetas", label: "Recetas", icon: UtensilsCrossed },
      { to: "/suscripcion", label: "Suscripción", icon: CreditCard },
    ];
  } else {
    links = [
      { to: "/", label: "Inicio", icon: Home },
      { to: "/recetas", label: "Recetas", icon: UtensilsCrossed },
      { to: "/suscripcion", label: "Planes", icon: CreditCard },
    ];
  }

  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-brand-cream/95 backdrop-blur-md border-t border-brand-line pb-safe"
    >
      <div className="flex items-stretch justify-around">
        {links.map((l) => {
          const active = location.pathname === l.to;
          return (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`mobilenav-${l.label.toLowerCase()}`}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors ${
                active ? "text-brand-green" : "text-brand-muted"
              }`}
            >
              <l.icon className={`w-5 h-5 ${active ? "scale-110" : ""} transition-transform`} />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
