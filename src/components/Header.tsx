import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: "Accueil", path: "/" },
    { name: "Fonctionnement", path: "/how-it-works" },
    { name: "Tarifs", path: "/pricing" },
    { name: "Contact", path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setIsMenuOpen(false);
  };

  const ctaTarget = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? "Mon dashboard" : "Créer mon événement";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            QR Memories
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-all duration-300 hover:text-primary ${
                  isActive(item.path) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.name}
              </Link>
            ))}
            {user ? (
              <>
                <Button asChild variant="hero" size="sm">
                  <Link to="/dashboard"><LayoutDashboard className="w-4 h-4" />Dashboard</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Déconnexion">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button asChild variant="hero" size="sm">
                <Link to={ctaTarget}>{ctaLabel}</Link>
              </Button>
            )}
          </nav>

          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border animate-fade-in">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block py-2 text-sm font-medium transition-colors ${
                  isActive(item.path) ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {user ? (
              <>
                <Button asChild variant="hero" size="sm" className="w-full mt-4">
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>Mon dashboard</Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" /> Déconnexion
                </Button>
              </>
            ) : (
              <Button asChild variant="hero" size="sm" className="w-full mt-4">
                <Link to={ctaTarget} onClick={() => setIsMenuOpen(false)}>{ctaLabel}</Link>
              </Button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
