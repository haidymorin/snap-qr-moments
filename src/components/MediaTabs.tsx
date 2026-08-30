import { Play } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type MediaFilter = "all" | "photo" | "video";

interface MediaTabsProps {
  value: MediaFilter;
  onChange: (value: MediaFilter) => void;
  counts: { all: number; photo: number; video: number };
}

/* Onglets au filet de 1 px : pas de pilule, pas d'ombre, pas de dégradé.
   L'onglet actif est signalé par un trait plein sous le libellé. */
const MediaTabs = ({ value, onChange, counts }: MediaTabsProps) => {
  const { t } = useLanguage();

  const tabs: { key: MediaFilter; label: string; count: number }[] = [
    { key: "all", label: t("guest.tabAll"), count: counts.all },
    { key: "photo", label: t("guest.tabPhotos"), count: counts.photo },
    { key: "video", label: t("guest.tabVideos"), count: counts.video },
  ];

  return (
    <div className="inline-flex border-b border-border" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          onClick={() => onChange(tab.key)}
          className={`label-mono -mb-px min-h-[44px] border-b px-4 py-3 transition-colors ${
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
