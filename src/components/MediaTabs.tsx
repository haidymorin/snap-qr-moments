import { Play } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/* La galerie de l'invité : deux barres, et deux questions distinctes.
 *
 * Il y en avait cinq côte à côte — Tout, Photos, Vidéos, Mes envois, Photos de
 * moi — qui mélangeaient deux choses n'ayant rien à voir : DE QUI sont les
 * photos, et QUEL TYPE de fichier. Sur un téléphone, cinq onglets débordent,
 * défilent horizontalement, et l'invité ne voit jamais les deux derniers — qui
 * sont pourtant ceux qu'il cherche.
 *
 * Désormais : une barre d'onglets qui répond à « lesquelles ? », et sous elle
 * un petit sélecteur qui répond à « photos ou vidéos ? ». Le second s'applique
 * au premier, quel qu'il soit. Deux onglets au départ, trois dès que l'invité
 * s'est reconnu, quatre s'il y a un jeu.
 */

/** Quelles photos on regarde. */
export type Section = "all" | "envois" | "mine" | "jeu";

/** Photos, vidéos, ou les deux. Passé tel quel au serveur. */
export type TypeMedia = "all" | "photo" | "video";

/* Conservé sous son ancien nom : la fonction de pagination le prend en
   argument, et il n'a jamais désigné que le type de fichier. */
export type MediaFilter = TypeMedia;

interface OngletsProps {
  section: Section;
  onSection: (s: Section) => void;
  counts: { all: number; envois: number; mine: number; jeu?: number };
}

export const GalerieOnglets = ({ section, onSection, counts }: OngletsProps) => {
  const { t } = useLanguage();

  const onglets: { key: Section; label: string; count: number }[] = [
    { key: "all", label: t("guest.tabAll"), count: counts.all },
  ];

  /* « Mes envois » est une vérification — « est-ce bien parti ? » — donc il
     vient tout de suite après l'album. */
  if (counts.envois > 0) {
    onglets.push({ key: "envois", label: t("guest.tabEnvois"), count: counts.envois });
  }

  /* Les photos reconnues n'apparaissent qu'une fois le selfie fait. C'est ce
     que l'invité est venu chercher : l'onglet se met en avant tout seul. */
  if (counts.mine > 0) {
    onglets.push({ key: "mine", label: t("guest.tabMine"), count: counts.mine });
  }

  if (counts.jeu && counts.jeu > 0) {
    onglets.push({ key: "jeu", label: t("guest.tabJeu"), count: counts.jeu });
  }

  return (
    <div className="flex max-w-full flex-wrap gap-2" role="tablist">
      {onglets.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={section === o.key}
          onClick={() => onSection(o.key)}
          className={`inline-flex min-h-[42px] items-center gap-2 rounded-full border px-4 text-[13.5px] transition-colors ${
            section === o.key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-foreground hover:border-primary"
          }`}
        >
          <span>{o.label}</span>
          <span
            className={`font-mono text-[12px] tabular-nums ${
              section === o.key ? "opacity-80" : "text-muted-foreground"
            }`}
          >
            {o.count}
          </span>
        </button>
      ))}
    </div>
  );
};

interface TypeProps {
  type: TypeMedia;
  onType: (t: TypeMedia) => void;
  counts: { all: number; photo: number; video: number };
}

/* Le sélecteur de type ne s'affiche que s'il y a quelque chose à choisir :
   sur un album sans une seule vidéo, proposer « Vidéos (0) » n'apporte rien. */
export const FiltreType = ({ type, onType, counts }: TypeProps) => {
  const { t } = useLanguage();
  if (counts.photo === 0 || counts.video === 0) return null;

  const choix: { key: TypeMedia; label: string; count: number }[] = [
    { key: "all", label: t("guest.typeTout"), count: counts.all },
    { key: "photo", label: t("guest.tabPhotos"), count: counts.photo },
    { key: "video", label: t("guest.tabVideos"), count: counts.video },
  ];

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border p-1">
      {choix.map((c) => (
        <button
          key={c.key}
          type="button"
          aria-pressed={type === c.key}
          onClick={() => onType(c.key)}
          className={`label-mono min-h-[34px] rounded-full px-3 transition-colors ${
            type === c.key
              ? "bg-secondary text-foreground opacity-100"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {c.label} {c.count}
        </button>
      ))}
    </div>
  );
};

export const PlayOverlay = () => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-black/40">
      <Play className="h-5 w-5 fill-white text-white" />
    </span>
  </div>
);

export default GalerieOnglets;
