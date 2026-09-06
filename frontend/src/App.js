import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";
import Landing from "@/pages/Landing";
import Recipes from "@/pages/Recipes";
import RecipeDetail from "@/pages/RecipeDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Subscription from "@/pages/Subscription";
import Admin from "@/pages/Admin";
import Menu from "@/pages/Menu";
import Compras from "@/pages/Compras";
import Progreso from "@/pages/Progreso";
import Calculadora from "@/pages/Calculadora";
import Bienestar from "@/pages/Bienestar";

function Layout({ children }) {
  return (
    <div className="App flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Layout><Landing /></Layout>} />
          <Route path="/recetas" element={<Layout><Recipes /></Layout>} />
          <Route path="/recetas/:id" element={<Layout><RecipeDetail /></Layout>} />
          <Route path="/login" element={<Layout><Login /></Layout>} />
          <Route path="/register" element={<Layout><Register /></Layout>} />
          <Route path="/suscripcion" element={<Layout><ProtectedRoute><Subscription /></ProtectedRoute></Layout>} />
          <Route path="/mi-menu" element={<Layout><ProtectedRoute requireSub><Menu /></ProtectedRoute></Layout>} />
          <Route path="/calculadora" element={<Layout><ProtectedRoute requireSub><Calculadora /></ProtectedRoute></Layout>} />
          <Route path="/bienestar" element={<Layout><ProtectedRoute requireSub><Bienestar /></ProtectedRoute></Layout>} />
          <Route path="/compras" element={<Layout><ProtectedRoute requireSub><Compras /></ProtectedRoute></Layout>} />
          <Route path="/mi-progreso" element={<Layout><ProtectedRoute requireSub><Progreso /></ProtectedRoute></Layout>} />
          <Route path="/admin" element={<Layout><ProtectedRoute adminOnly><Admin /></ProtectedRoute></Layout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
