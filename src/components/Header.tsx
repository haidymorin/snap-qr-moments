import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: t("nav.home"), path: "/" },
    { name: t("nav.how"), path: "/how-it-works" },
    { name: t("nav.pricing"), path: "/pricing" },
    { name: t("nav.contact"), path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setIsMenuOpen(false);
  };

  const ctaTarget = user ? "/dashboard" : "/auth";
  const ctaLabel = user ? t("nav.dashboard") : t("nav.cta");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            QR Memories
          </Link>

          <nav className="hidden md:flex items-center gap-6">
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
            <LanguageSwitcher />
            {user ? (
              <>
                <Button asChild variant="hero" size="sm">
                  <Link to="/dashboard"><LayoutDashboard className="w-4 h-4" />{t("nav.dashboard")}</Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label={t("nav.signOut")}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button asChild variant="hero" size="sm">
                <Link to={ctaTarget}>{ctaLabel}</Link>
              </Button>
            )}
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
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
                  <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>{t("nav.dashboard")}</Link>
                </Button>
                <Button variant="outline" size="sm" className="w-full mt-2" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" /> {t("nav.signOut")}
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
