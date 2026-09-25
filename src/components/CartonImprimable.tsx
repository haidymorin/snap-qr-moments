import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  PX_PAR_MM, type ElementCarton, type JeuCouleurs, type JeuPolices, type ModeleCarton,
} from "@/data/modelesCarton";

/* Le rendu d'un carton, à la taille réelle.
 *
 * Les positions viennent du canevas où la mise en page a été validée à la
 * main, en pixels à 96 par pouce. On les convertit en millimètres et on les
 * écrit en absolu : le carton sort de l'imprimante exactement comme il a été
 * disposé, sans qu'aucune règle de mise en page ne vienne « corriger »
 * quelque chose.
 *
 * Deux invariants, et ils ne se négocient pas :
 *
 *   1. Le QR code est noir sur blanc. Sur un fond sombre il reçoit une
 *      plaque blanche ; sur un fond clair il se pose directement. Un code
 *      teinté ne se scanne pas de façon fiable, et l'invité qui échoue trois
 *      fois repose son téléphone.
 *   2. Le carton garde sa taille en millimètres. On ne l'étire jamais pour
 *      remplir un écran : ce qui est annoncé 90 × 55 mm sort à 90 × 55 mm.
 */

export interface Textes {
  noms: string;
  phrase: string;
  date: string;
  legende: string;
  marque: string;
  /* Le menu du repas. Facultatif : seuls les modèles qui en portent un
     lisent ces champs, et un champ laissé vide ne dessine rien. */
  menuTitre?: string;
  service1?: string;
  plat1?: string;
  service2?: string;
  plat2?: string;
  service3?: string;
  plat3?: string;
}

interface Props {
  modele: ModeleCarton;
  couleurs: JeuCouleurs;
  polices: JeuPolices;
  textes: Textes;
  url: string;
  /** L'adresse de la photo des mariés, ou null. */
  photo?: string | null;
  /** Facteur d'affichage. 1 = taille réelle ; l'impression utilise toujours 1. */
  zoom?: number;
  /** Masquer qr-memories.fr. */
  sansMarque?: boolean;
}

const clair = (hex: string) => {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 165;
};

const Coeur = ({ couleur }: { couleur: string }) => (
  <svg viewBox="0 0 24 22" aria-hidden style={{ width: "100%", height: "100%", display: "block" }}>
    <path
      d="M12 21C12 21 1 14.2 1 7.6 1 3.9 3.9 1 7.4 1c2 0 3.7 1 4.6 2.5C12.9 2 14.6 1 16.6 1 20.1 1 23 3.9 23 7.6 23 14.2 12 21 12 21Z"
      fill={couleur}
    />
  </svg>
);

/* Faire tenir un texte dans la place prévue.
 *
 * Les modèles fixent une taille de police à la main. Tant que les prénoms
 * sont courts, tout va bien ; « Marie-Charlotte & Jean-Baptiste » déborde,
 * passe à la ligne, recouvre la phrase posée en dessous, et le bas est coupé
 * par le carton. Personne ne s'en aperçoit avant d'avoir imprimé.
 *
 * On mesure donc le texte pour de bon, avec la police réellement chargée, et
 * on réduit la taille jusqu'à ce qu'il tienne — au maximum de moitié, en
 * dessous ce n'est plus lisible sur un carton de table, et mieux vaut alors
 * deux lignes qu'un texte minuscule. */

const LIGNES_MAX = 2;
const REDUCTION_MAX = 0.5;

let toileMesure: CanvasRenderingContext2D | null = null;
function mesurer(texte: string, police: string, taillePx: number): number {
  if (!toileMesure) {
    const c = document.createElement("canvas");
    toileMesure = c.getContext("2d");
  }
  if (!toileMesure) return 0;
  toileMesure.font = `${taillePx}px ${police}`;
  return toileMesure.measureText(texte).width;
}

/** Le plus grand facteur ≤ 1 pour que le texte tienne en LIGNES_MAX lignes. */
function facteurAjustement(
  texte: string,
  police: string,
  largeurMm: number,
  tailleMm: number,
  ecartEm: number,
): number {
  if (!texte.trim() || largeurMm <= 0 || tailleMm <= 0) return 1;
  /* On raisonne en unités arbitraires : seul le rapport compte. */
  const REF = 100;
  const largeurRef = (largeurMm / tailleMm) * REF;
  const mots = texte.split(/\s+/);
  const largeurMot = Math.max(...mots.map((m) => mesurer(m, police, REF) + m.length * ecartEm * REF));
  const largeurTotale = mesurer(texte, police, REF) + texte.length * ecartEm * REF;

  /* Deux contraintes : le mot le plus long doit tenir sur une ligne, et
     l'ensemble doit tenir en LIGNES_MAX lignes. */
  const facteur = Math.min(
    largeurRef / Math.max(largeurMot, 1),
    (largeurRef * LIGNES_MAX * 0.94) / Math.max(largeurTotale, 1),
    1,
  );
  return Math.max(facteur, REDUCTION_MAX);
}

const CartonImprimable = ({
  modele, couleurs, polices, textes, url, photo, zoom = 1, sansMarque,
}: Props) => {
  /* Mesurer avant que les polices soient chargées donnerait la largeur d'une
     police de substitution, donc un mauvais facteur. On attend, puis on
     recalcule une fois. */
  const [policesPretes, setPolicesPretes] = useState(false);
  useEffect(() => {
    let vivant = true;
    const prete = () => { if (vivant) setPolicesPretes(true); };
    if (document.fonts?.ready) document.fonts.ready.then(prete).catch(prete);
    else prete();
    return () => { vivant = false; };
  }, [polices.titre, polices.script, polices.texte]);

  /* Un millimètre du modèle vaut un millimètre sur le papier. Le zoom ne
     change que l'aperçu à l'écran. */
  const mm = (pxCanevas: number) => (pxCanevas / PX_PAR_MM) * zoom;
  const fondClair = clair(couleurs.fond);

  const famille = (role: "titre" | "script" | "texte") =>
    role === "titre"
      ? `"${polices.titre}", "Arial Narrow", sans-serif`
      : role === "script"
        ? `"${polices.script}", "Brush Script MT", cursive`
        : `"${polices.texte}", ui-monospace, monospace`;

  const rendre = (el: ElementCarton, i: number) => {
    const base = {
      position: "absolute" as const,
      left: `${mm(el.x)}mm`,
      top: `${mm(el.y)}mm`,
    };

    if (el.genre === "qr") {
      const bord = fondClair ? 0 : mm(11);
      return (
        <div
          key={i}
          style={{
            ...base,
            width: `${mm(el.cote) + 2 * bord}mm`,
            height: `${mm(el.cote) + 2 * bord}mm`,
            background: fondClair ? "transparent" : "#ffffff",
            padding: `${bord}mm`,
            boxSizing: "border-box",
          }}
        >
          {/* Une toile de 4 fois la taille finale : à l'impression, un QR
              code rendu à la taille d'écran sort crénelé. */}
          <QRCodeCanvas
            value={url}
            size={Math.round(el.cote * 4)}
            level="H"
            bgColor="#ffffff"
            fgColor="#000000"
            style={{ width: "100%", height: "100%", display: "block" }}
          />
        </div>
      );
    }

    if (el.genre === "photo") {
      if (!photo) return null;
      return (
        <img
          key={i}
          src={photo}
          alt=""
          style={{
            ...base,
            width: `${mm(el.l)}mm`,
            height: `${mm(el.h)}mm`,
            objectFit: "cover",
            display: "block",
            filter: couleurs.gris ? "grayscale(1)" : undefined,
          }}
        />
      );
    }

    if (el.genre === "cadre") {
      return (
        <div
          key={i}
          aria-hidden
          style={{
            ...base,
            width: `${mm(el.l)}mm`,
            height: `${mm(el.h)}mm`,
            border: `0.25mm solid ${couleurs.accent}`,
            opacity: 0.55,
            boxSizing: "border-box",
          }}
        />
      );
    }

    if (el.genre === "filet") {
      return (
        <div
          key={i}
          aria-hidden
          style={{
            ...base,
            width: `${mm(el.l)}mm`,
            height: `${Math.max(mm(el.h), 0.25)}mm`,
            background: couleurs.accent,
            opacity: 0.6,
          }}
        />
      );
    }

    if (el.genre === "coeur") {
      return (
        <div key={i} style={{ ...base, width: `${mm(el.cote)}mm`, height: `${mm(el.cote * 22 / 24)}mm` }}>
          <Coeur couleur={couleurs.accent} />
        </div>
      );
    }

    if (el.champ === "marque" && sansMarque) return null;

    const contenu = textes[el.champ] ?? "";
    if (!contenu.trim()) return null;

    const police = famille(el.police);
    const facteur = policesPretes
      ? facteurAjustement(contenu, police, mm(el.l), mm(el.taille), el.ecart ?? 0)
      : 1;

    return (
      <div
        key={i}
        style={{
          ...base,
          width: `${mm(el.l)}mm`,
          fontFamily: police,
          fontSize: `${mm(el.taille) * facteur}mm`,
          lineHeight: el.hauteurLigne ?? 1,
          letterSpacing: el.ecart ? `${el.ecart}em` : undefined,
          color: couleurs[el.couleur],
          textAlign: "center",
        }}
      >
        {contenu}
      </div>
    );
  };

  return (
    <div
      className="carton"
      style={{
        position: "relative",
        width: `${mm(modele.px.l)}mm`,
        height: `${mm(modele.px.h)}mm`,
        background: couleurs.fond,
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {modele.elements.map(rendre)}
    </div>
  );
};

export default CartonImprimable;
