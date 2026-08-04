import { Play } from "lucide-react";

export type MediaFilter = "all" | "photo" | "video";

interface MediaTabsProps {
  value: MediaFilter;
  onChange: (value: MediaFilter) => void;
  counts: { all: number; photo: number; video: number };
}

const MediaTabs = ({ value, onChange, counts }: MediaTabsProps) => {
  const tabs: { key: MediaFilter; label: string; count: number }[] = [
    { key: "all", label: "Tout", count: counts.all },
    { key: "photo", label: "Photos", count: counts.photo },
    { key: "video", label: "Vidéos", count: counts.video },
  ];

  return (
    <div className="inline-flex p-1 rounded-full bg-muted border border-border shadow-soft">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
            value === tab.key
              ? "bg-gradient-hero text-white shadow-card"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label} ({tab.count})
        </button>
      ))}
    </div>
  );
};

export const PlayOverlay = () => (
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <Play className="w-6 h-6 text-white fill-white" />
    </div>
  </div>
);

export default MediaTabs;
