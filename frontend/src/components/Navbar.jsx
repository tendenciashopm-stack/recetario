import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Leaf, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: "Inicio" },
    { to: "/recetas", label: "Recetas" },
    { to: "/suscripcion", label: "Planes y Suscripción" },
  ];

  const statusBadge = () => {
    if (!user || user.role === "admin") return null;
    const s = user.subscription_status;
    const map = {
      active: { t: "Suscripción Activa", c: "bg-emerald-100 text-emerald-800" },
      pending: { t: "Pago Pendiente", c: "bg-amber-100 text-amber-800" },
      inactive: { t: "Sin Suscripción", c: "bg-stone-100 text-stone-600" },
      expired: { t: "Suscripción Vencida", c: "bg-red-100 text-red-700" },
    };
    const b = map[s] || map.inactive;
    return <span data-testid="nav-subscription-status" className={`hidden lg:inline text-xs px-3 py-1 rounded-full font-medium ${b.c}`}>{b.t}</span>;
  };

  const doLogout = () => { logout(); navigate("/"); setOpen(false); };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-brand-cream/85 border-b border-brand-line">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 h-16 flex items-center justify-between">
        <Link to="/" data-testid="nav-brand-logo" className="flex items-center gap-2 group">
          <span className="w-9 h-9 rounded-xl bg-brand-green flex items-center justify-center text-white">
            <Leaf className="w-5 h-5" />
          </span>
          <span className="font-serif text-xl font-bold text-brand-ink tracking-tight">Salud <span className="text-brand-green">Nutrition</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <Link key={l.to} to={l.to} data-testid={`nav-link-${l.label.split(" ")[0].toLowerCase()}`}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === l.to ? "text-brand-green" : "text-brand-muted hover:text-brand-ink"}`}>
              {l.label}
            </Link>
          ))}
          {user?.role === "admin" && (
            <Link to="/admin" data-testid="nav-link-admin" className="px-3 py-2 rounded-lg text-sm font-medium text-brand-terracotta hover:opacity-80 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Admin
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {statusBadge()}
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
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-brand-ink font-medium">{l.label}</Link>
          ))}
          {user?.role === "admin" && <Link to="/admin" onClick={() => setOpen(false)} className="block px-3 py-2 rounded-lg text-brand-terracotta font-medium">Admin</Link>}
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
