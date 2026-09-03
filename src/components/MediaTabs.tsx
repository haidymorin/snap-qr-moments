import { Play } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/* Aucun de ces onglets n'est un mode qui remplace la galerie : ce sont des
   filtres. L'invité doit pouvoir passer de ses photos à toutes les photos, et
   revenir, sans jamais perdre l'un ou l'autre.

   Deux d'entre eux ont failli porter le même nom, et c'était le vrai défaut de
   la page : « mine » contient les photos **où l'invité apparaît**, « envois »
   celles **qu'il a envoyées**. Tout le monde lisait « Vos photos » comme la
   seconde alors que c'était la première. D'où « Photos de moi » d'un côté,
   « Mes envois » de l'autre — le nom dit de qui, ou de quoi, il s'agit. */
export type MediaFilter = "all" | "photo" | "video" | "mine" | "envois";

interface MediaTabsProps {
  value: MediaFilter;
  onChange: (value: MediaFilter) => void;
  counts: { all: number; photo: number; video: number };
  /** Nombre de photos reconnues. Absent ou nul : l'onglet ne s'affiche pas. */
  mineCount?: number;
  /** Nombre de fichiers déposés depuis ce téléphone. Idem. */
  envoisCount?: number;
}

/* Onglets au filet de 1 px : pas de pilule, pas d'ombre, pas de dégradé.
   L'onglet actif est signalé par un trait plein sous le libellé. */
const MediaTabs = ({ value, onChange, counts, mineCount, envoisCount }: MediaTabsProps) => {
  const { t } = useLanguage();

  const tabs: { key: MediaFilter; label: string; count: number }[] = [
    { key: "all", label: t("guest.tabAll"), count: counts.all },
    { key: "photo", label: t("guest.tabPhotos"), count: counts.photo },
    { key: "video", label: t("guest.tabVideos"), count: counts.video },
  ];

  // « Mes envois » vient après les filtres de type : c'est une vérification,
  // pas une destination.
  if (envoisCount && envoisCount > 0) {
    tabs.push({ key: "envois", label: t("guest.tabEnvois"), count: envoisCount });
  }

  // L'onglet des photos reconnues n'apparaît qu'une fois la recherche faite,
  // et se place en premier : c'est ce que l'invité est venu chercher.
  if (mineCount && mineCount > 0) {
    tabs.unshift({ key: "mine", label: t("guest.tabMine"), count: mineCount });
  }

  return (
    <div className="inline-flex max-w-full overflow-x-auto border-b border-border" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className={`label-mono -mb-px min-h-[44px] shrink-0 border-b px-4 py-3 transition-colors ${
            value === tab.key
              ? "border-primary text-foreground opacity-100"
              : "border-transparent hover:text-foreground"
          }`}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
};

export const PlayOverlay = () => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <span className="flex h-11 w-11 items-center justify-center border border-white/70 bg-black/40">
      <Play className="h-5 w-5 fill-white text-white" />
    </span>
  </div>
);

export default MediaTabs;
