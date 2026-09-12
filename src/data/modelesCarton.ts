/* Les modèles de carton, mis en page par Haïdy sur le canevas.
 *
 * Chaque élément porte sa propre position, en pixels du canevas où la
 * disposition a été validée — 96 pixels par pouce, donc 3,7795 pixels par
 * millimètre. Le rendu à l'écran et à l'impression repart de ces nombres et
 * les met à l'échelle : rien n'est recalculé, rien n'est « amélioré ».
 *
 * Aucun empilement, aucune colonne. Un élément se place où il a été posé, et
 * déplacer l'un n'a jamais déplacé les autres. C'est ce qui a permis de
 * valider une mise en page à la main plutôt que de la deviner.
 *
 * Le QR code est le seul élément dont on ne touche ni la taille relative ni
 * le contraste : noir sur blanc, toujours.
 */

export type RoleCouleur = "titre" | "texte" | "accent";
export type RolePolice = "titre" | "script" | "texte";

interface Base {
  x: number;
  y: number;
}

export interface ElementTexte extends Base {
  genre: "texte";
  /** Quelle chaîne afficher : les noms, la phrase, la date, la légende, la marque. */
  champ:
    | "noms" | "phrase" | "date" | "legende" | "marque"
    /* Le menu du repas, sur les modèles qui en portent un. Les trois
       services et leurs plats sont saisis par les mariés. */
    | "menuTitre"
    | "service1" | "plat1"
    | "service2" | "plat2"
    | "service3" | "plat3";
  l: number;
  taille: number;
  police: RolePolice;
  couleur: RoleCouleur;
  /** Interlettrage, en em. */
  ecart?: number;
  hauteurLigne?: number;
}

export interface ElementQr extends Base {
  genre: "qr";
  cote: number;
}

export interface ElementPhoto extends Base {
  genre: "photo";
  l: number;
  h: number;
}

export interface ElementCoeur extends Base {
  genre: "coeur";
  cote: number;
}

/** Un filet fin en retrait des bords. Zéro encre en plus, un caractère
 *  différent : c'est ce qui distingue le modèle « Filet » du chevalet nu. */
export interface ElementCadre extends Base {
  genre: "cadre";
  l: number;
  h: number;
}

/** Un trait de séparation, horizontal. */
export interface ElementFilet extends Base {
  genre: "filet";
  l: number;
  h: number;
}

export type ElementCarton =
  | ElementTexte | ElementQr | ElementPhoto | ElementCoeur
  | ElementCadre | ElementFilet;

export interface ModeleCarton {
  id: string;
  /** Le nom montré aux mariés. */
  nom: string;
  nomEn: string;
  /** Millimètres, taille finale après découpe. */
  mm: { l: number; h: number };
  /** Pixels du canevas de référence. */
  px: { l: number; h: number };
  /** Se plie en deux pour tenir debout ? */
  plie: boolean;
  /** Exemplaires par page A4. */
  parPage: number;
  elements: ElementCarton[];
}

/** 96 pixels par pouce : le canevas où les dispositions ont été validées. */
export const PX_PAR_MM = 96 / 25.4;

export const MODELES: ModeleCarton[] = [
  {
    id: "chevalet",
    nom: "Chevalet de table",
    nomEn: "Table card",
    mm: { l: 90, h: 55 },
    px: { l: 340, h: 208 },
    plie: true,
    parPage: 4,
    elements: [
      { genre: "texte", champ: "noms",    x: 21,  y: 52,  l: 178, taille: 27,  police: "titre",  couleur: "titre", ecart: 0.02 },
      { genre: "texte", champ: "phrase",  x: 17,  y: 71,  l: 178, taille: 30,  police: "script", couleur: "titre", hauteurLigne: 1.05 },
      { genre: "texte", champ: "date",    x: 56,  y: 112, l: 114, taille: 8,   police: "texte",  couleur: "texte", ecart: 0.28 },
      { genre: "coeur",                   x: 107, y: 135, cote: 9 },
      { genre: "qr",                      x: 220, y: 56,  cote: 80 },
      { genre: "texte", champ: "legende", x: 210, y: 148, l: 100, taille: 7,   police: "texte",  couleur: "texte", ecart: 0.10 },
      { genre: "texte", champ: "marque",  x: 124, y: 191, l: 90,  taille: 6,   police: "texte",  couleur: "accent", ecart: 0.14 },
    ],
  },
  {
    id: "petit-carton",
    nom: "Petit carton",
    nomEn: "Small card",
    mm: { l: 85, h: 55 },
    px: { l: 321, h: 208 },
    plie: false,
    parPage: 10,
    elements: [
      { genre: "texte", champ: "noms",    x: 21,  y: 52,  l: 167, taille: 24,  police: "titre",  couleur: "titre", ecart: 0.02 },
      { genre: "texte", champ: "phrase",  x: 21,  y: 73,  l: 167, taille: 27,  police: "script", couleur: "titre", hauteurLigne: 1.05 },
      { genre: "texte", champ: "date",    x: 29,  y: 113, l: 167, taille: 8,   police: "texte",  couleur: "texte", ecart: 0.26 },
      { genre: "coeur",                   x: 101, y: 139, cote: 9 },
      { genre: "qr",                      x: 209, y: 48,  cote: 74 },
      { genre: "texte", champ: "legende", x: 198, y: 139, l: 94,  taille: 6.5, police: "texte",  couleur: "texte", ecart: 0.10 },
      { genre: "texte", champ: "marque",  x: 21,  y: 190, l: 281, taille: 6,   police: "texte",  couleur: "accent", ecart: 0.14 },
    ],
  },
  {
    id: "chevalet-moyen",
    nom: "Chevalet moyen",
    nomEn: "Medium card",
    mm: { l: 105, h: 105 },
    px: { l: 397, h: 397 },
    plie: true,
    parPage: 2,
    elements: [
      { genre: "texte", champ: "noms",    x: 19,  y: 26,  l: 352, taille: 38,  police: "titre",  couleur: "titre", ecart: 0.02 },
      { genre: "texte", champ: "phrase",  x: 21,  y: 54,  l: 345, taille: 37,  police: "script", couleur: "titre", hauteurLigne: 1.05 },
      { genre: "photo",                   x: 24,  y: 100, l: 350, h: 107 },
      { genre: "texte", champ: "date",    x: 34,  y: 217, l: 345, taille: 10,  police: "texte",  couleur: "texte", ecart: 0.28 },
      { genre: "qr",                      x: 141, y: 240, cote: 113 },
      { genre: "texte", champ: "legende", x: 142, y: 355, l: 117, taille: 8,   police: "texte",  couleur: "texte", ecart: 0.14 },
      { genre: "coeur",                   x: 195, y: 378, cote: 11 },
      { genre: "texte", champ: "marque",  x: 260, y: 379, l: 127, taille: 7,   police: "texte",  couleur: "accent", ecart: 0.14 },
    ],
  },
  {
    id: "grand-chevalet",
    nom: "Grand chevalet",
    nomEn: "Large card",
    mm: { l: 148, h: 148 },
    px: { l: 559, h: 559 },
    plie: true,
    parPage: 1,
    elements: [
      { genre: "texte", champ: "noms",    x: 40,  y: 56,  l: 479, taille: 54,  police: "titre",  couleur: "titre", ecart: 0.02 },
      { genre: "texte", champ: "phrase",  x: 40,  y: 101, l: 479, taille: 58,  police: "script", couleur: "titre", hauteurLigne: 1.05 },
      { genre: "texte", champ: "date",    x: 40,  y: 192, l: 479, taille: 13,  police: "texte",  couleur: "texte", ecart: 0.30 },
      { genre: "qr",                      x: 210, y: 250, cote: 140 },
      { genre: "texte", champ: "legende", x: 200, y: 400, l: 159, taille: 11,  police: "texte",  couleur: "texte", ecart: 0.16 },
      { genre: "coeur",                   x: 272, y: 440, cote: 15 },
      { genre: "texte", champ: "marque",  x: 40,  y: 520, l: 479, taille: 9,   police: "texte",  couleur: "accent", ecart: 0.16 },
    ],
  },
  {
    id: "marque-page",
    nom: "Marque-page",
    nomEn: "Long card",
    mm: { l: 90, h: 210 },
    px: { l: 340, h: 794 },
    plie: false,
    parPage: 2,
    elements: [
      { genre: "texte", champ: "noms",    x: 26,  y: 46,  l: 288, taille: 42,  police: "titre",  couleur: "titre", ecart: 0.02 },
      { genre: "texte", champ: "phrase",  x: 26,  y: 92,  l: 288, taille: 46,  police: "script", couleur: "titre", hauteurLigne: 1.05 },
      { genre: "texte", champ: "date",    x: 26,  y: 158, l: 288, taille: 12,  police: "texte",  couleur: "texte", ecart: 0.30 },
      { genre: "photo",                   x: 50,  y: 189, l: 247, h: 289 },
      { genre: "qr",                      x: 98,  y: 512, cote: 141 },
      { genre: "texte", champ: "legende", x: 91,  y: 660, l: 150, taille: 9,   police: "texte",  couleur: "texte", ecart: 0.16 },
      { genre: "coeur",                   x: 162, y: 700, cote: 15 },
      { genre: "texte", champ: "marque",  x: 26,  y: 740, l: 288, taille: 8,   police: "texte",  couleur: "accent", ecart: 0.16 },
    ],
  },

  {
    id: "chevalet-filet",
    nom: "Chevalet au filet",
    nomEn: "Framed table card",
    mm: { l: 90, h: 55 },
    px: { l: 340, h: 208 },
    plie: true,
    parPage: 4,
    elements: [
      { genre: "cadre",                   x: 15,  y: 15,  l: 310, h: 178 },
      { genre: "texte", champ: "noms",    x: 21,  y: 52,  l: 178, taille: 27,  police: "titre",  couleur: "titre", ecart: 0.02 },
      { genre: "texte", champ: "phrase",  x: 17,  y: 71,  l: 178, taille: 30,  police: "script", couleur: "titre", hauteurLigne: 1.05 },
      { genre: "texte", champ: "date",    x: 56,  y: 112, l: 114, taille: 8,   police: "texte",  couleur: "texte", ecart: 0.28 },
      { genre: "coeur",                   x: 107, y: 135, cote: 9 },
      { genre: "qr",                      x: 220, y: 56,  cote: 80 },
      { genre: "texte", champ: "legende", x: 210, y: 148, l: 100, taille: 7,   police: "texte",  couleur: "texte", ecart: 0.10 },
      { genre: "texte", champ: "marque",  x: 125, y: 182, l: 90,  taille: 6,   police: "texte",  couleur: "accent", ecart: 0.14 },
    ],
  },
  {
    id: "marque-page-menu",
    nom: "Marque-page menu",
    nomEn: "Menu card",
    mm: { l: 90, h: 210 },
    px: { l: 340, h: 794 },
    plie: false,
    parPage: 2,
    elements: [
      { genre: "texte", champ: "noms",      x: 26,  y: 46,  l: 288, taille: 42, police: "titre",  couleur: "titre", ecart: 0.02 },
      { genre: "texte", champ: "date",      x: 30,  y: 103, l: 288, taille: 12, police: "texte",  couleur: "texte", ecart: 0.30 },
      { genre: "texte", champ: "menuTitre", x: 27,  y: 144, l: 288, taille: 46, police: "script", couleur: "titre", hauteurLigne: 1.05 },
      { genre: "texte", champ: "service1",  x: 28,  y: 215, l: 288, taille: 9,  police: "texte",  couleur: "accent", ecart: 0.26, hauteurLigne: 1.35 },
      { genre: "texte", champ: "plat1",     x: 25,  y: 237, l: 288, taille: 11, police: "texte",  couleur: "texte",  ecart: 0.02, hauteurLigne: 1.35 },
      { genre: "texte", champ: "service2",  x: 27,  y: 276, l: 288, taille: 9,  police: "texte",  couleur: "accent", ecart: 0.26, hauteurLigne: 1.35 },
      { genre: "texte", champ: "plat2",     x: 25,  y: 300, l: 288, taille: 11, police: "texte",  couleur: "texte",  ecart: 0.02, hauteurLigne: 1.35 },
      { genre: "texte", champ: "service3",  x: 26,  y: 339, l: 288, taille: 9,  police: "texte",  couleur: "accent", ecart: 0.26, hauteurLigne: 1.35 },
      { genre: "texte", champ: "plat3",     x: 25,  y: 356, l: 288, taille: 11, police: "texte",  couleur: "texte",  ecart: 0.02, hauteurLigne: 1.35 },
      { genre: "filet",                     x: 140, y: 393, l: 60,  h: 1 },
      { genre: "texte", champ: "phrase",    x: 23,  y: 427, l: 288, taille: 46, police: "script", couleur: "titre", hauteurLigne: 1.05 },
      { genre: "qr",                        x: 100, y: 508, cote: 141 },
      { genre: "texte", champ: "legende",   x: 97,  y: 659, l: 150, taille: 9,  police: "texte",  couleur: "texte", ecart: 0.16 },
      { genre: "coeur",                     x: 162, y: 700, cote: 15 },
      { genre: "texte", champ: "marque",    x: 26,  y: 740, l: 288, taille: 8,  police: "texte",  couleur: "accent", ecart: 0.16 },
    ],
  },
];

export const modele = (id: string) => MODELES.find((m) => m.id === id) ?? MODELES[0];

/* ── Les polices.
 *
 * Les quatre sont sous licence ouverte (Google Fonts), donc diffusables depuis
 * le site. Anton, Allison et Anonymous Pro viennent des favoris de Haïdy ;
 * Playfair et Cormorant complètent pour ceux qui veulent une empattement.
 */
export interface JeuPolices {
  id: string;
  nom: string;
  titre: string;
  script: string;
  texte: string;
}

export const POLICES: JeuPolices[] = [
  { id: "anton",     nom: "Anton",     titre: "Anton",              script: "Allison",    texte: "Anonymous Pro" },
  { id: "playfair",  nom: "Élégant",   titre: "Playfair Display",   script: "Allison",    texte: "Anonymous Pro" },
  { id: "cormorant", nom: "Délicat",   titre: "Cormorant Garamond", script: "Parisienne", texte: "Cormorant Garamond" },
  { id: "moderne",   nom: "Moderne",   titre: "Bricolage Grotesque", script: "Parisienne", texte: "Instrument Sans" },
];

export const jeuPolices = (id: string) => POLICES.find((p) => p.id === id) ?? POLICES[0];

/* ── Les couleurs.
 *
 * « Noir et blanc » n'est pas un dégradé des autres : c'est le jeu à choisir
 * quand on imprime sur une laser de bureau. Un fond crème y sort gris sale.
 */
export interface JeuCouleurs {
  id: string;
  nom: string;
  fond: string;
  titre: string;
  texte: string;
  accent: string;
  /** Vrai : la photo passe en niveaux de gris. */
  gris?: boolean;
}

export const COULEURS: JeuCouleurs[] = [
  { id: "ivoire", nom: "Ivoire", fond: "#faf8f4", titre: "#181614", texte: "#605a54", accent: "#ba7a3e" },
  { id: "sauge",  nom: "Sauge",  fond: "#ecefe9", titre: "#283228", texte: "#5e685c", accent: "#a0865e" },
  { id: "rose",   nom: "Rosé",   fond: "#f7f0ec", titre: "#2a1d1a", texte: "#6b5a52", accent: "#b4745e" },
  { id: "nuit",   nom: "Nuit",   fond: "#20202a", titre: "#f2eee8", texte: "#c6c0b8", accent: "#d9b98a" },
  { id: "noir",   nom: "Noir et blanc — impression", fond: "#ffffff", titre: "#000000", texte: "#4e4e4e", accent: "#787878", gris: true },
];

export const jeuCouleurs = (id: string) => COULEURS.find((c) => c.id === id) ?? COULEURS[0];
