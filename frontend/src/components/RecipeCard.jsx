import { Link } from "react-router-dom";
import { resolveImg, CATEGORY_META } from "@/lib/api";
import { Clock, Timer, UtensilsCrossed } from "lucide-react";

export function RecipeCard({ recipe, index = 0 }) {
  const meta = CATEGORY_META[recipe.categoria] || { label: recipe.categoria, cls: "bg-stone-100 text-stone-700" };
  return (
    <Link
      to={`/recetas/${recipe.id}`}
      data-testid={`recipe-card-${recipe.id}`}
      className="group block bg-white rounded-2xl border border-brand-line overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 fade-up"
      style={{ animationDelay: `${(index % 8) * 60}ms` }}
    >
      <div className="relative h-52 overflow-hidden bg-brand-sand">
        {recipe.imagen_url ? (
          <img src={resolveImg(recipe.imagen_url)} alt={recipe.nombre_plato} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-muted"><UtensilsCrossed className="w-10 h-10" /></div>
        )}
        <span className={`absolute top-3 left-3 text-xs px-3 py-1 rounded-full border font-medium ${meta.cls}`}>{meta.label}</span>
      </div>
      <div className="p-5">
        <h3 className="font-serif text-lg font-bold text-brand-ink leading-snug group-hover:text-brand-green transition-colors line-clamp-2">{recipe.nombre_plato}</h3>
        <p className="text-sm text-brand-muted mt-2 line-clamp-2 leading-relaxed">{recipe.descripcion}</p>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-brand-line text-xs text-brand-muted">
          {recipe.tiempo_preparacion && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {recipe.tiempo_preparacion}</span>}
          {recipe.tiempo_coccion && <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {recipe.tiempo_coccion}</span>}
          {recipe.dificultad && <span className="ml-auto font-medium text-brand-green">{recipe.dificultad}</span>}
        </div>
      </div>
    </Link>
  );
}
