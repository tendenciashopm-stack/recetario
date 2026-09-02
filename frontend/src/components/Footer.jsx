import { Leaf } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-brand-ink text-brand-cream/80 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-14 grid md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-9 h-9 rounded-xl bg-brand-green flex items-center justify-center text-white"><Leaf className="w-5 h-5" /></span>
            <span className="font-serif text-xl font-bold text-white">Salud Nutrition</span>
          </div>
          <p className="text-sm leading-relaxed max-w-xs">Recetas saludables, nutritivas y diseñadas para tu bienestar. Para diabéticos, control de peso, comida saludable y veganos.</p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4 font-sans">Navegación</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/recetas" className="hover:text-brand-terracotta">Recetas</Link></li>
            <li><Link to="/suscripcion" className="hover:text-brand-terracotta">Planes y Suscripción</Link></li>
            <li><Link to="/login" className="hover:text-brand-terracotta">Ingresar</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4 font-sans">Suscripción</h4>
          <p className="text-sm">Acceso completo a todas nuestras recetas saludables.</p>
          <p className="text-sm mt-2">Pago con Yape, Plin, BCP y BBVA.</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs text-brand-cream/50">© {new Date().getFullYear()} Salud Nutrition. Todos los derechos reservados.</div>
    </footer>
  );
}
