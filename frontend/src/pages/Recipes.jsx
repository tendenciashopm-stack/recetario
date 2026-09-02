import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { RecipeCard } from "@/components/RecipeCard";
import { Search, Loader2, X, UtensilsCrossed } from "lucide-react";

export default function Recipes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(searchParams.get("q") || "");
  const activeCat = searchParams.get("categoria") || "";

  useEffect(() => { api.get("/categories").then((r) => setCategories(r.data)).catch(() => {}); }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeCat) params.categoria = activeCat;
      const search = searchParams.get("q");
      if (search) params.q = search;
      const { data } = await api.get("/recipes", { params });
      setRecipes(data);
    } finally { setLoading(false); }
  }, [activeCat, searchParams]);

  useEffect(() => { load(); }, [load]);

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (q) next.set("q", q); else next.delete("q");
    setSearchParams(next);
  };

  const setCat = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("categoria", id); else next.delete("categoria");
    setSearchParams(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-12">
      <div className="mb-8">
        <p className="eyebrow">Catálogo</p>
        <h1 className="font-serif text-4xl font-bold text-brand-ink mt-2">Buscador de Recetas</h1>
        <p className="text-brand-muted mt-2">Encuentra recetas por nombre, ingrediente o categoría.</p>
      </div>

      <form onSubmit={submitSearch} className="relative max-w-2xl mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted" />
        <input data-testid="recipe-search-input" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Busca 'quinua', 'pollo', 'ensalada'..."
          className="w-full pl-12 pr-28 py-4 rounded-full border border-brand-line bg-white focus:outline-none focus:ring-2 focus:ring-brand-green" />
        <button type="submit" data-testid="recipe-search-btn" className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-full bg-brand-green text-white font-medium text-sm hover:bg-brand-greenHover transition-colors">Buscar</button>
      </form>

      <div className="flex flex-wrap gap-2 mb-10">
        <button onClick={() => setCat("")} data-testid="category-filter-all"
          className={`text-sm px-4 py-2 rounded-full font-medium transition-colors ${!activeCat ? "bg-brand-green text-white" : "bg-white border border-brand-line text-brand-muted hover:bg-brand-sand"}`}>Todas</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} data-testid={`category-filter-${c.id}`}
            className={`text-sm px-4 py-2 rounded-full font-medium transition-colors ${activeCat === c.id ? "bg-brand-green text-white" : "bg-white border border-brand-line text-brand-muted hover:bg-brand-sand"}`}>{c.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-24 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-green" /></div>
      ) : recipes.length === 0 ? (
        <div className="py-24 text-center text-brand-muted">
          <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p>No se encontraron recetas. {searchParams.get("q") && <button onClick={() => { setQ(""); setCat(""); setSearchParams({}); }} className="text-brand-green underline inline-flex items-center gap-1"><X className="w-3 h-3" /> Limpiar filtros</button>}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-brand-muted mb-5" data-testid="recipe-results-count">{recipes.length} receta(s) encontrada(s)</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((r, i) => <RecipeCard key={r.id} recipe={r} index={i} />)}
          </div>
        </>
      )}
    </div>
  );
}
