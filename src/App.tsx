import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense } from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import RouteEffects from "./components/RouteEffects";


/* L'accueil est chargé d'emblée : c'est la page d'entrée la plus fréquente et
   la première impression ne doit pas attendre. Tout le reste est découpé en
   morceaux chargés à la demande.

   Ce qui compte vraiment ici : un invité qui ouvre la galerie de son mariage
   sur le réseau saturé d'une salle de réception ne télécharge plus le tableau
   de bord, la page de tarifs ni les conditions de vente — seulement ce dont
   il a besoin. */
import Index from "./pages/Index";

const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Albums = lazy(() => import("./pages/Albums"));
const CreerEvenement = lazy(() => import("./pages/CreerEvenement"));
const Contact = lazy(() => import("./pages/Contact"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Admin = lazy(() => import("./pages/Admin"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const GuestEvent = lazy(() => import("./pages/GuestEvent"));
const PaiementReussi = lazy(() => import("./pages/PaiementReussi"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Legal = lazy(() => import("./pages/Legal"));
const Terms = lazy(() => import("./pages/Terms"));

/* Un aplat de la couleur du fond pendant le chargement d'un morceau : pas de
   roue qui tourne, pas de saut de mise en page. */
const Attente = () => <div className="min-h-screen bg-background" />;

const App = () => (
  <>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <RouteEffects />
            <Suspense fallback={<Attente />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/albums" element={<Albums />} />
              <Route path="/creer" element={<CreerEvenement />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/dashboard/event/:id" element={<EventDetail />} />
              <Route path="/event/:id" element={<GuestEvent />} />
              <Route path="/paiement-reussi" element={<PaiementReussi />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/legal" element={<Legal />} />
              <Route path="/cgv" element={<Terms />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
  </>
);

export default App;
