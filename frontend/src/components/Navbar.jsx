import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Leaf, Menu, X, ShieldCheck, Home, UtensilsCrossed, CalendarDays, ShoppingCart, BarChart3, CreditCard, Calculator } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const memberActive = user && (user.role === "admin" || user.subscription_status === "active");

  let links;
  if (memberActive) {
    links = [
      { to: "/", label: "Inicio", icon: Home },
      { to: "/recetas", label: "Recetas", icon: UtensilsCrossed },
      { to: "/calculadora", label: "Calculadora", icon: Calculator },
      { to: "/mi-menu", label: "Mi Menú", icon: CalendarDays },
      { to: "/compras", label: "Compras", icon: ShoppingCart },
      { to: "/mi-progreso", label: "Mi Progreso", icon: BarChart3 },
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

  const doLogout = () => { logout(); navigate("/"); setOpen(false); };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-brand-cream/85 border-b border-brand-line">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between gap-2">
        <Link to="/" data-testid="nav-brand-logo" className="flex items-center gap-2 group shrink-0">
          <span className="w-9 h-9 rounded-xl bg-brand-green flex items-center justify-center text-white"><Leaf className="w-5 h-5" /></span>
          <span className="font-serif text-lg lg:text-xl font-bold text-brand-ink tracking-tight hidden sm:block">Salud <span className="text-brand-green">Nutrition</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-0.5">
          {links.map((l) => (
            <Link key={l.to} to={l.to} data-testid={`nav-link-${l.label.split(" ").join("-").toLowerCase()}`}
              className={`px-2.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${location.pathname === l.to ? "text-brand-green bg-brand-greenLight" : "text-brand-muted hover:text-brand-ink"}`}>
              <l.icon className="w-4 h-4" /> {l.label}
            </Link>
          ))}
          {user?.role === "admin" && (
            <Link to="/admin" data-testid="nav-link-admin" className="px-2.5 py-2 rounded-lg text-sm font-medium text-brand-terracotta hover:opacity-80 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Admin
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <span className="text-sm text-brand-muted">Hola, {user.name?.split(" ")[0]}</span>
              <button onClick={doLogout} data-testid="nav-logout-btn" className="text-sm font-medium px-4 py-2 rounded-full border border-brand-line hover:bg-brand-sand transition-colors">Salir</button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login-btn" className="text-sm font-medium px-4 py-2 rounded-full hover:bg-brand-sand transition-colors">Ingresar</Link>
              <Link to="/register" data-testid="nav-register-btn" className="text-sm font-semibold px-4 py-2 rounded-full bg-brand-green text-white hover:bg-brand-greenHover transition-all hover:scale-[1.02]">Crear cuenta</Link>
            </>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-brand-line bg-brand-cream px-4 py-4 space-y-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-brand-ink font-medium"><l.icon className="w-4 h-4" /> {l.label}</Link>
          ))}
          {user?.role === "admin" && <Link to="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-brand-terracotta font-medium"><ShieldCheck className="w-4 h-4" /> Admin</Link>}
          <div className="pt-2 border-t border-brand-line">
            {user ? (
              <button onClick={doLogout} className="w-full text-left px-3 py-2 font-medium">Salir</button>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="block px-3 py-2 font-medium">Ingresar</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="block px-3 py-2 font-semibold text-brand-green">Crear cuenta</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
