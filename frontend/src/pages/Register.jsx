import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Leaf, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    setLoading(true);
    const res = await register(name, email, password);
    setLoading(false);
    if (res.ok) {
      toast.success("¡Cuenta creada! Ahora suscríbete para acceder.");
      navigate("/suscripcion");
    } else {
      toast.error(res.error);
    }
  };

  return (
    <div className="min-h-[80vh] grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16 order-2 lg:order-1">
        <form onSubmit={submit} className="w-full max-w-sm" data-testid="register-form">
          <div className="flex items-center gap-2 mb-8">
            <span className="w-9 h-9 rounded-xl bg-brand-green flex items-center justify-center text-white"><Leaf className="w-5 h-5" /></span>
            <span className="font-serif text-xl font-bold">Salud Nutrition</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-brand-ink">Crear cuenta</h1>
          <p className="text-brand-muted mt-2 mb-8 text-sm">Únete y accede a recetas saludables por S/ 15.00 al mes.</p>

          <label className="block text-sm font-medium mb-1.5">Nombre completo</label>
          <input data-testid="register-name-input" required value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green mb-4" placeholder="Tu nombre" />

          <label className="block text-sm font-medium mb-1.5">Correo electrónico</label>
          <input data-testid="register-email-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green mb-4" placeholder="tucorreo@ejemplo.com" />

          <label className="block text-sm font-medium mb-1.5">Contraseña</label>
          <input data-testid="register-password-input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green mb-6" placeholder="Mínimo 6 caracteres" />

          <button type="submit" disabled={loading} data-testid="register-submit-btn"
            className="w-full py-3 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-greenHover transition-all hover:scale-[1.01] disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Crear mi cuenta
          </button>

          <p className="text-sm text-center mt-6 text-brand-muted">¿Ya tienes cuenta? <Link to="/login" className="text-brand-green font-semibold hover:underline">Inicia sesión</Link></p>
        </form>
      </div>
      <div className="hidden lg:block relative order-1 lg:order-2">
        <img src="https://images.unsplash.com/photo-1494859802809-d069c3b71a8a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200" alt="Comida saludable" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-brand-terracotta/40" />
        <div className="absolute bottom-12 right-12 text-white max-w-sm text-right">
          <p className="eyebrow text-white">Empieza hoy</p>
          <h2 className="font-serif text-4xl font-bold mt-3 leading-tight text-white">Recetas para diabéticos, veganos y más.</h2>
        </div>
      </div>
    </div>
  );
}
