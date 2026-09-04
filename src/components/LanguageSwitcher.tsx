import { useLanguage, Lang } from "@/contexts/LanguageContext";

/* Bascule de langue. Charte : pas d'angle arrondi, pas de blanc pur, pas
   d'ombre. Deux étiquettes en capitales espacées séparées par un filet de
   1 px ; la langue active est en plein, l'autre en retrait. */
const LanguageSwitcher = ({ className = "" }: { className?: string }) => {
  const { lang, setLang } = useLanguage();

  const btn = (value: Lang, label: string) => (
    <button
      key={value}
      onClick={() => setLang(value)}
      className={`min-h-[30px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors ${
        lang === value
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
      aria-label={`Switch to ${label}`}
      aria-pressed={lang === value}
    >
      {label}
    </button>
  );

  return (
    <div
      className={`inline-flex items-center divide-x divide-border rounded-xl border border-border ${className}`}
    >
      {btn("fr", "FR")}
      {btn("en", "EN")}
    </div>
  );
};

export default LanguageSwitcher;
