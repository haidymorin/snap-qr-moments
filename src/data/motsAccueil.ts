import { Lang } from "@/contexts/LanguageContext";

/* Les mots d'accueil proposés.
 *
 * Le champ libre existait déjà, et la plupart des mariés le laissaient vide :
 * devant une case vide, on ne trouve rien à écrire. Une liste de propositions
 * règle ça — on choisit beaucoup plus volontiers qu'on n'invente, et rien
 * n'empêche d'écrire la sienne par-dessus.
 *
 * Chaque phrase dit sur quels supports elle a un sens : « Avant de partir,
 * envoyez vos photos » n'a rien à faire sur le panneau de l'entrée, et
 * « Bienvenue » n'a rien à faire sur un petit carton posé près du vestiaire.
 *
 * Elles sont écrites du point de vue des mariés, jamais du nôtre. Un carton
 * qui sonne comme un prestataire est un carton qu'on ne pose pas sur ses
 * tables.
 */

export type Support = "panneau" | "chevalet" | "carton";

export interface MotAccueil {
  texte: string;
  /** Les supports sur lesquels la phrase a du sens. */
  supports: Support[];
}

export interface GroupeMots {
  titre: string;
  mots: MotAccueil[];
}

const TOUS: Support[] = ["panneau", "chevalet", "carton"];

export const MOTS_ACCUEIL: Record<Lang, GroupeMots[]> = {
  fr: [
    {
      titre: "Simples et directs",
      mots: [
        { texte: "Partagez vos photos de la soirée", supports: TOUS },
        { texte: "Vos photos, ici", supports: TOUS },
        { texte: "Notre album, c'est vous", supports: TOUS },
        { texte: "Vous êtes nos photographes", supports: TOUS },
        { texte: "On compte sur vos photos", supports: TOUS },
        { texte: "Prenez, partagez, gardez", supports: ["chevalet", "carton"] },
      ],
    },
    {
      titre: "Un peu plus personnels",
      mots: [
        { texte: "Notre journée vue par vous", supports: TOUS },
        { texte: "Ce que vous avez vu, on veut le voir", supports: TOUS },
        { texte: "Nos souvenirs sont dans vos téléphones", supports: TOUS },
        { texte: "Le photographe ne voit pas tout", supports: ["panneau", "chevalet"] },
        { texte: "Que rien ne se perde", supports: TOUS },
        { texte: "Merci d'être là. Et de photographier.", supports: ["chevalet", "carton"] },
      ],
    },
    {
      titre: "Selon l'endroit",
      mots: [
        { texte: "Bienvenue. Vos photos, par ici.", supports: ["panneau"] },
        { texte: "Avant de danser, scannez", supports: ["panneau"] },
        { texte: "Entre le plat et le dessert, scannez", supports: ["chevalet"] },
        { texte: "Sur cette table aussi, on compte sur vous", supports: ["chevalet"] },
        { texte: "Avant de partir, envoyez vos photos", supports: ["panneau", "carton"] },
        { texte: "Le photographe est parti. Pas vous.", supports: ["chevalet", "carton"] },
      ],
    },
    {
      titre: "En anglais",
      mots: [
        { texte: "Share the love", supports: TOUS },
        { texte: "Share your photos with us", supports: TOUS },
        { texte: "Through your eyes", supports: TOUS },
        { texte: "Our album needs you", supports: TOUS },
        { texte: "Snap, share, celebrate", supports: ["chevalet", "carton"] },
        { texte: "Don't keep them to yourself", supports: ["chevalet", "carton"] },
      ],
    },
  ],

  en: [
    {
      titre: "Simple and direct",
      mots: [
        { texte: "Share your photos from tonight", supports: TOUS },
        { texte: "Your photos, here", supports: TOUS },
        { texte: "Our album is you", supports: TOUS },
        { texte: "You are our photographers", supports: TOUS },
        { texte: "We are counting on your photos", supports: TOUS },
        { texte: "Snap, share, keep", supports: ["chevalet", "carton"] },
      ],
    },
    {
      titre: "A little more personal",
      mots: [
        { texte: "Our day through your eyes", supports: TOUS },
        { texte: "What you saw, we want to see", supports: TOUS },
        { texte: "Our memories are on your phones", supports: TOUS },
        { texte: "The photographer can't see everything", supports: ["panneau", "chevalet"] },
        { texte: "Let's not lose a single one", supports: TOUS },
        { texte: "Thank you for being here. Now shoot.", supports: ["chevalet", "carton"] },
      ],
    },
    {
      titre: "Depending on where it sits",
      mots: [
        { texte: "Welcome. Your photos, this way.", supports: ["panneau"] },
        { texte: "Before you dance, scan", supports: ["panneau"] },
        { texte: "Between the main and dessert, scan", supports: ["chevalet"] },
        { texte: "On this table too, we need you", supports: ["chevalet"] },
        { texte: "Before you leave, send your photos", supports: ["panneau", "carton"] },
        { texte: "The photographer has gone. You haven't.", supports: ["chevalet", "carton"] },
      ],
    },
    {
      titre: "In French",
      mots: [
        { texte: "Partagez vos photos", supports: TOUS },
        { texte: "Vos photos, ici", supports: TOUS },
        { texte: "Notre album, c'est vous", supports: TOUS },
        { texte: "Notre journée vue par vous", supports: TOUS },
      ],
    },
  ],
};

/** Les propositions qui ont un sens sur le support en cours d'aperçu. */
export const motsPour = (lang: Lang, support: Support): GroupeMots[] =>
  MOTS_ACCUEIL[lang]
    .map((g) => ({ ...g, mots: g.mots.filter((m) => m.supports.includes(support)) }))
    .filter((g) => g.mots.length > 0);
