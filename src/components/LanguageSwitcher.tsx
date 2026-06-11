import { useLanguage, Lang } from "@/contexts/LanguageContext";

const LanguageSwitcher = ({ className = "" }: { className?: string }) => {
  const { lang, setLang } = useLanguage();

  const btn = (value: Lang, label: string) => (
    <button
      key={value}
      onClick={() => setLang(value)}
      className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-all ${
        lang === value
          ? "bg-gradient-hero text-white shadow-soft"
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
      className={`inline-flex items-center gap-1 p-1 rounded-full bg-muted border border-border ${className}`}
    >
      {btn("fr", "FR")}
      {btn("en", "EN")}
    </div>
  );
};

export default LanguageSwitcher;
