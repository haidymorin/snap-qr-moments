import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, LayoutDashboard, UserRound } from "lucide-react";
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
    { name: t("nav.albums"), path: "/albums" },
    { name: t("nav.contact"), path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setIsMenuOpen(false);
  };

  const ctaTarget = user ? "/dashboard" : "/creer";
  const ctaLabel = user ? t("nav.dashboard") : t("nav.cta");

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-[72px]">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-[26px] text-foreground">
              QR <em className="italic">Memories</em>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`border-b border-transparent pb-1 text-[12.5px] font-medium uppercase tracking-[0.09em] transition-colors hover:border-foreground ${
                  isActive(item.path) ? "text-foreground border-foreground" : "text-muted-foreground"
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
              <>
                {/* Depuis que « Créer mon événement » mène au parcours d'achat,
                    plus rien ne conduisait à la page de connexion : quelqu'un
                    qui a déjà un compte n'avait aucun moyen d'y revenir. */}
                <Link
                  to="/auth?mode=signin"
                  aria-label={t("nav.signIn")}
                  title={t("nav.signIn")}
                  className="flex min-h-[38px] items-center gap-2 rounded-full border border-border px-3 text-[12.5px] font-medium uppercase tracking-[0.09em] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  <UserRound className="h-4 w-4" />
                  <span className="hidden lg:inline">{t("nav.signIn")}</span>
                </Link>
                <Button asChild variant="hero" size="sm">
                  <Link to={ctaTarget}>{ctaLabel}</Link>
                </Button>
              </>
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
              <>
                <Button asChild variant="hero" size="sm" className="w-full mt-4">
                  <Link to={ctaTarget} onClick={() => setIsMenuOpen(false)}>{ctaLabel}</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full mt-2">
                  <Link to="/auth?mode=signin" onClick={() => setIsMenuOpen(false)}>
                    <UserRound className="w-4 h-4" /> {t("nav.signIn")}
                  </Link>
                </Button>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
