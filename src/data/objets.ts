import { type Lang } from "@/contexts/LanguageContext";

/* Les objets imprimés, désormais sur leur propre page.
 *
 * Ils étaient relégués en bas de la page des tarifs, sous les trois formules,
 * là où personne ne descend. Ce sont pourtant eux qui font la différence entre
 * un service qu'on oublie en six mois et un souvenir qu'on garde : ils
 * méritent un onglet.
 */

export interface Objet {
  titre: string;
  prix: string;
  /** Ce que c'est, en une phrase, pour quelqu'un qui n'a jamais vu l'objet. */
  quoi: string;
  /** Le détail matériel : format, papier, nombre de pages. */
  detail: string;
  /** Ce qu'on en fait. */
  pourQui: string;
  inclus?: string;
}

export const OBJETS: Record<Lang, { objets: Objet[]; note: string }> = {
  fr: {
    note:
      "Tout se commande après l'événement, une fois les photos arrivées et triées. Vous voyez ce que vous avez avant de choisir ce que vous en faites — rien n'est à décider maintenant.",
    objets: [
      {
        titre: "L'album photo grand format",
        prix: "249 €",
        quoi:
          "Un vrai livre photo, celui qu'on pose sur une table basse et qu'on rouvre dix ans plus tard.",
        detail:
          "30 × 30 cm, environ 80 pages, papier épais, couverture toilée. Il s'ouvre bien à plat, donc une photo peut occuper les deux pages sans se casser au milieu.",
        pourQui:
          "Vos photos et les mots de vos invités en vis-à-vis. Nous faisons la mise en page, vous relisez et vous validez avant impression.",
        inclus: "Compris dans la formule Héritage",
      },
      {
        titre: "La gazette de votre événement, 50 exemplaires",
        prix: "149 €",
        quoi:
          "Un petit journal de quatre pages qui raconte votre journée, imprimé en cinquante exemplaires.",
        detail:
          "Format journal, papier mat, quatre pages. Vos photos, les messages de vos invités et les moments de la journée mis en page comme un vrai quotidien.",
        pourQui:
          "À poster à ceux qui n'ont pas pu venir, ou à glisser dans les remerciements.",
        inclus: "Compris dans la formule Héritage",
      },
      {
        titre: "La gazette, 100 exemplaires",
        prix: "219 €",
        quoi: "La même gazette, en double.",
        detail: "Même format, même papier, cent exemplaires au lieu de cinquante.",
        pourQui:
          "Pour les événements à deux cents personnes, ou les familles qui en redemandent une fois qu'elles l'ont vue.",
      },
      {
        titre: "Le mini-album",
        prix: "79 €",
        quoi: "Un petit album souple, à offrir.",
        detail: "20 × 20 cm, couverture souple, quarante pages.",
        pourQui:
          "Aux parents, aux témoins, à ceux qui ont porté la journée. Souvent commandé en trois ou quatre exemplaires.",
      },
      {
        titre: "Le kit d'affiches imprimé",
        prix: "89 €",
        quoi:
          "Vos affiches déjà imprimées et livrées chez vous, pour ne pas courir chez l'imprimeur la veille.",
        detail:
          "Le panneau d'accueil au format A2 sur papier rigide, et douze chevalets de table. Livrés une semaine avant votre date.",
        pourQui: "Le fichier PDF à imprimer soi-même reste compris dans toutes les formules.",
      },
      {
        titre: "Une année de plus en ligne",
        prix: "29 €",
        quoi: "Pour garder la galerie ouverte un an de plus que les six mois compris.",
        detail:
          "À prendre autant de fois que vous le voulez, tant que l'échéance n'est pas passée. Nous vous prévenons trente jours avant.",
        pourQui:
          "Utile si vous n'avez pas encore tout téléchargé, ou si des invités demandent encore le lien.",
      },
    ],
  },

  en: {
    note:
      "Everything is ordered after the event, once the photos have arrived and been sorted. You see what you have before deciding what to make of it — nothing to decide now.",
    objets: [
      {
        titre: "The large photo album",
        prix: "€249",
        quoi: "A real photo book — the kind that sits on a coffee table and gets reopened ten years later.",
        detail:
          "30 × 30 cm, around 80 pages, heavy paper, cloth cover. It lies flat when open, so a photo can spread across both pages without breaking in the middle.",
        pourQui:
          "Your photos facing your guests' words. We do the layout, you read it and approve before printing.",
        inclus: "Included in the Heritage plan",
      },
      {
        titre: "Your event newspaper, 50 copies",
        prix: "€149",
        quoi: "A four-page paper telling the story of your day, printed in fifty copies.",
        detail:
          "Newspaper format, matte paper, four pages. Your photos, your guests' messages and the moments of the day, laid out like a real daily.",
        pourQui: "To post to those who could not come, or to slip into your thank-you notes.",
        inclus: "Included in the Heritage plan",
      },
      {
        titre: "The newspaper, 100 copies",
        prix: "€219",
        quoi: "The same paper, twice over.",
        detail: "Same format, same paper, a hundred copies instead of fifty.",
        pourQui: "For two-hundred-guest events, or families who ask for more once they have seen it.",
      },
      {
        titre: "The mini album",
        prix: "€79",
        quoi: "A small soft-cover album, made to be given away.",
        detail: "20 × 20 cm, soft cover, forty pages.",
        pourQui:
          "For the parents, the witnesses, the people who carried the day. Often ordered three or four at a time.",
      },
      {
        titre: "The printed sign kit",
        prix: "€89",
        quoi: "Your signs printed and delivered, so you are not at a print shop the night before.",
        detail:
          "The A2 welcome sign on rigid board, and twelve table cards. Delivered a week before your date.",
        pourQui: "The print-it-yourself PDF stays included in every plan.",
      },
      {
        titre: "One more year online",
        prix: "€29",
        quoi: "To keep the gallery open a year beyond the six months included.",
        detail:
          "Add it as many times as you like, before the deadline passes. We warn you thirty days ahead.",
        pourQui: "Useful if you have not downloaded everything, or guests are still asking for the link.",
      },
    ],
  },
};
