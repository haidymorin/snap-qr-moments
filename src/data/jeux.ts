import { type Lang } from "@/contexts/LanguageContext";

/* Les trois modèles de jeu.
 *
 * Un seul moteur — un défi, une photo, un point — et trois façons de compter.
 * Les défis sont écrits pour être lus en marchant, un verre à la main, par
 * quelqu'un qui a déjà bu deux coupes. Courts, concrets, jamais deux fois la
 * même idée.
 *
 * Aucun défi ne demande de photographier quelqu'un à son insu, de se moquer
 * d'un invité ou de fouiller une pièce privée. Ça paraît évident jusqu'au
 * moment où une liste toute faite fait dire à un cousin « prends la pire tenue
 * de la salle » et qu'une personne se reconnaît. Les défis qui visent
 * quelqu'un visent toujours les mariés, qui ont signé pour ça.
 */

export type ModeleJeu = "chasse" | "bingo" | "objectif";

export interface Modele {
  id: ModeleJeu;
  nom: string;
  promesse: string;
  /** Ce que ça change pour les invités, en une phrase. */
  comment: string;
  /** Le nombre de défis que le modèle attend. */
  taille: number;
  defis: Record<string, string[]>;
}

const DEFIS_MARIAGE_FR = [
  "Les mariés qui ne regardent pas l'objectif",
  "Une photo avec quelqu'un que vous ne connaissiez pas ce matin",
  "La table la plus bruyante",
  "Les chaussures de la mariée",
  "Quelqu'un qui rit tellement qu'il ne peut plus parler",
  "Trois générations sur la même photo",
  "Le dessert avant que quelqu'un y touche",
  "Une photo prise depuis la piste de danse",
  "La personne la plus élégante de la soirée",
  "Un détail que personne ne remarquera",
  "Les témoins, réunis",
  "Le moment juste après les applaudissements",
  "Quelqu'un qui a retiré ses chaussures",
  "La plus vieille personne de la salle, souriante",
  "Une photo de groupe où tout le monde saute",
  "Le bouquet, où qu'il soit",
];

const DEFIS_MARIAGE_EN = [
  "The couple not looking at the camera",
  "A photo with someone you did not know this morning",
  "The loudest table",
  "The bride's shoes",
  "Someone laughing too hard to speak",
  "Three generations in one photo",
  "The dessert before anyone touches it",
  "A photo taken from the dance floor",
  "The best-dressed person of the night",
  "A detail nobody else will notice",
  "The witnesses, together",
  "The moment right after the applause",
  "Someone who has taken their shoes off",
  "The oldest person in the room, smiling",
  "A group photo where everyone jumps",
  "The bouquet, wherever it is",
];

const DEFIS_AUTRE_FR = [
  "La personne qui organise tout, enfin assise",
  "Une photo avec quelqu'un d'une autre table",
  "Le moment le plus calme de la soirée",
  "Quelqu'un qui rit aux éclats",
  "La décoration vue de près",
  "Un groupe de quatre personnes minimum",
  "Le buffet avant l'assaut",
  "Une photo prise en hauteur",
  "Deux personnes qui se retrouvent",
  "Le détail que vous avez préféré",
  "Quelqu'un en pleine conversation",
  "La dernière photo de la soirée",
];

const DEFIS_AUTRE_EN = [
  "The person who organised it all, finally sitting down",
  "A photo with someone from another table",
  "The quietest moment of the night",
  "Someone laughing out loud",
  "The decorations, up close",
  "A group of at least four people",
  "The buffet before the rush",
  "A photo taken from above",
  "Two people meeting again",
  "The detail you liked best",
  "Someone mid-conversation",
  "The last photo of the night",
];

export const MODELES: Record<Lang, Modele[]> = {
  fr: [
    {
      id: "chasse",
      nom: "La chasse au trésor",
      promesse: "Douze défis à relever dans la soirée.",
      comment:
        "Chaque invité voit la liste, choisit un défi, envoie sa photo. Le défi se coche. Celui qui en relève le plus gagne.",
      taille: 12,
      defis: { mariage: DEFIS_MARIAGE_FR.slice(0, 12), autre: DEFIS_AUTRE_FR.slice(0, 12) },
    },
    {
      id: "bingo",
      nom: "Le bingo",
      promesse: "Une grille de seize cases à remplir.",
      comment:
        "Les défis s'affichent en grille. Une ligne, une colonne ou une diagonale complète, et c'est gagné. Le plus visuel des trois, et le plus facile à filmer.",
      taille: 16,
      defis: { mariage: DEFIS_MARIAGE_FR, autre: [...DEFIS_AUTRE_FR, ...DEFIS_MARIAGE_FR.slice(0, 4)] },
    },
    {
      id: "objectif",
      nom: "Dix avant le dessert",
      promesse: "Un objectif chiffré, une barre qui se remplit.",
      comment:
        "Dix défis, une barre de progression, et c'est tout. Le plus simple à comprendre — celui qu'on choisit quand la moyenne d'âge de la salle dépasse cinquante ans.",
      taille: 10,
      defis: { mariage: DEFIS_MARIAGE_FR.slice(0, 10), autre: DEFIS_AUTRE_FR.slice(0, 10) },
    },
  ],
  en: [
    {
      id: "chasse",
      nom: "The treasure hunt",
      promesse: "Twelve challenges to take on during the night.",
      comment:
        "Every guest sees the list, picks a challenge, sends their photo. The challenge is ticked off. Whoever takes on the most wins.",
      taille: 12,
      defis: { mariage: DEFIS_MARIAGE_EN.slice(0, 12), autre: DEFIS_AUTRE_EN.slice(0, 12) },
    },
    {
      id: "bingo",
      nom: "The bingo",
      promesse: "A sixteen-square grid to fill.",
      comment:
        "The challenges appear as a grid. Complete a row, a column or a diagonal and you win. The most visual of the three, and the easiest to film.",
      taille: 16,
      defis: { mariage: DEFIS_MARIAGE_EN, autre: [...DEFIS_AUTRE_EN, ...DEFIS_MARIAGE_EN.slice(0, 4)] },
    },
    {
      id: "objectif",
      nom: "Ten before dessert",
      promesse: "A number to hit, and a bar that fills up.",
      comment:
        "Ten challenges, a progress bar, nothing else. The easiest to grasp — the one to pick when the average age in the room is over fifty.",
      taille: 10,
      defis: { mariage: DEFIS_MARIAGE_EN.slice(0, 10), autre: DEFIS_AUTRE_EN.slice(0, 10) },
    },
  ],
};

export const modeleJeu = (lang: Lang, id: ModeleJeu) =>
  MODELES[lang].find((m) => m.id === id) ?? MODELES[lang][0];

/** Les défis proposés par défaut, selon le type d'événement. */
export const defisProposes = (lang: Lang, id: ModeleJeu, typeEvenement: string) => {
  const m = modeleJeu(lang, id);
  const source = typeEvenement === "mariage" ? m.defis.mariage : m.defis.autre;
  return source.slice(0, m.taille);
};
