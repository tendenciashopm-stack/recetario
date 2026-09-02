import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      toast.success("¡Bienvenido de nuevo!");
      navigate(res.user?.role === "admin" ? "/admin" : "/recetas");
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2">
      <div className="hidden lg:block relative">
        <img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200" alt="Comida saludable" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-brand-green/50" />
        <div className="absolute bottom-12 left-12 text-white max-w-sm">
          <p className="eyebrow text-brand-gold">Salud Nutrition</p>
          <h2 className="font-serif text-4xl font-bold mt-3 leading-tight text-white">Come rico, come sano, vive mejor.</h2>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="login-form">
          <div className="flex items-center gap-2 mb-8">
            <span className="w-9 h-9 rounded-xl bg-brand-green flex items-center justify-center text-white"><Leaf className="w-5 h-5" /></span>
            <span className="font-serif text-xl font-bold">Salud Nutrition</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-brand-ink">Iniciar sesión</h1>
          <p className="text-brand-muted mt-2 mb-8 text-sm">Ingresa a tu cuenta para ver todas las recetas.</p>

          <label className="block text-sm font-medium mb-1.5">Correo electrónico</label>
          <input data-testid="login-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green mb-4" placeholder="tucorreo@ejemplo.com" />

          <label className="block text-sm font-medium mb-1.5">Contraseña</label>
          <input data-testid="login-password-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green mb-6" placeholder="••••••••" />

          <button type="submit" disabled={loading} data-testid="login-submit-btn"
            className="w-full py-3 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover transition-all hover:scale-[1.01] disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Ingresar
          </button>

          <p className="text-sm text-center mt-6 text-brand-muted">¿No tienes cuenta? <Link to="/register" className="text-brand-green font-semibold hover:underline">Regístrate aquí</Link></p>
        </form>
      </div>
    </div>
  );
}
