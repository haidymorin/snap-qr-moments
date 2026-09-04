import { type PlanId } from "@/lib/checkout";
import { type Lang } from "@/contexts/LanguageContext";

/* Le contenu des trois formules, en un seul endroit.
 *
 * Il était écrit trois fois — sur la page d'accueil, sur la page des tarifs,
 * dans le formulaire de commande — et les trois versions avaient déjà commencé
 * à diverger. Une personne qui lit « le tri » sur une page et « le nettoyage
 * automatique » sur la suivante ne sait pas si c'est la même chose.
 *
 * Le vocabulaire est explicite — on écrit « QR code » et « galerie en ligne »,
 * jamais « QR » ni « la collecte » — mais on n'explique pas ce qu'est un QR
 * code. Une personne qui organise un mariage en 2026 en a scanné cent. Une
 * ligne dit ce qu'on livre, pas comment ça marche.
 */

export interface Formule {
  id: PlanId;
  nom: string;
  prix: string;
  prixCentimes: number;
  periode: string;
  /** Une phrase : à qui elle s'adresse et ce qu'elle règle. */
  pitch: string;
  /** Le résumé d'une ligne, pour la page d'accueil et le récapitulatif. */
  resume: string;
  /** « Tout ce que contient X, et en plus : » */
  herite?: string;
  points: string[];
  badge?: string;
  vedette?: boolean;
  cta: string;
}

export const FORMULES: Record<Lang, Formule[]> = {
  fr: [
    {
      id: "essentiel",
      nom: "Essentiel",
      prix: "59 €",
      prixCentimes: 5900,
      periode: "pour un événement",
      pitch:
        "Tout ce qu'il faut pour que vos invités déposent leurs photos pendant la fête, et que vous les récupériez toutes le lendemain.",
      resume:
        "Le QR code, la galerie en ligne, le tri automatique et les affiches à imprimer. Vos photos restent six mois en ligne.",
      cta: "Choisir l'Essentiel",
      points: [
        "Un QR code personnalisé, à imprimer et à poser sur les tables",
        "Une galerie en ligne privée, photos et vidéos illimitées",
        "Aucune application à installer et aucun compte à créer pour vos invités",
        "Le tri automatique des doublons et des photos floues",
        "Téléchargement en qualité d'origine, pour vous comme pour vos invités",
        "Les affiches et les chevalets de table, en PDF prêt à imprimer",
        "Galerie en ligne six mois, et tout l'album téléchargeable en un clic",
      ],
    },
    {
      id: "souvenir",
      nom: "Souvenir",
      prix: "179 €",
      prixCentimes: 17900,
      periode: "pour un événement",
      badge: "Le plus choisi",
      vedette: true,
      pitch:
        "Celle qu'on prend quand on ne veut pas seulement des photos, mais aussi les mots de ceux qui étaient là.",
      resume:
        "Tout l'Essentiel, plus le livre d'or, la recherche par visage et le diaporama projeté pendant la soirée.",
      herite: "Tout ce que contient l'Essentiel, et en plus :",
      cta: "Choisir le Souvenir",
      points: [
        "Le livre d'or numérique : messages écrits, vocaux et vidéo",
        "La reconnaissance faciale : chaque invité retrouve ses photos avec un selfie",
        "Le diaporama en direct, projeté sur un écran pendant la soirée",
        "Votre page, votre QR code et vos affiches à vos couleurs et à votre nom",
      ],
    },
    {
      id: "heritage",
      nom: "Héritage",
      prix: "390 €",
      prixCentimes: 39000,
      periode: "pour un événement",
      pitch:
        "Tout le numérique, et les objets imprimés qui restent quand la galerie, elle, aura fermé.",
      resume:
        "Tout le Souvenir, plus l'album photo imprimé grand format et la gazette de votre événement en cinquante exemplaires.",
      herite: "Tout ce que contient le Souvenir, et en plus :",
      cta: "Choisir l'Héritage",
      points: [
        "L'album photo imprimé grand format 30 × 30 (249 € s'il est pris seul)",
        "La gazette de votre événement, 50 exemplaires (149 € si elle est prise seule)",
        "La mise en page faite par nos soins, que vous validez avant impression",
      ],
    },
  ],

  en: [
    {
      id: "essentiel",
      nom: "Essential",
      prix: "€59",
      prixCentimes: 5900,
      periode: "for one event",
      pitch:
        "Everything you need for guests to send their photos during the party, and for you to get every one of them the next morning.",
      resume:
        "The QR code, the online gallery, automatic sorting and printable signs. Your photos stay online for six months.",
      cta: "Choose Essential",
      points: [
        "A personalised QR code, to print and put on the tables",
        "A private online gallery, unlimited photos and videos",
        "No app to install and no account to create for your guests",
        "Automatic sorting of duplicates and blurry photos",
        "Original-quality downloads, for you and for your guests",
        "Signs and table cards, as a print-ready PDF",
        "Six months online, and the whole album downloadable in one click",
      ],
    },
    {
      id: "souvenir",
      nom: "Souvenir",
      prix: "€179",
      prixCentimes: 17900,
      periode: "for one event",
      badge: "Most chosen",
      vedette: true,
      pitch:
        "The one you take when you want more than photos — the words of the people who were there.",
      resume:
        "Everything in Essential, plus the guest book, face search and the slideshow projected during the party.",
      herite: "Everything in Essential, plus:",
      cta: "Choose Souvenir",
      points: [
        "The digital guest book: written, voice and video messages",
        "Face recognition: every guest finds their photos from a selfie",
        "The live slideshow, projected on a screen during the party",
        "Your page, your QR code and your signs in your colours and name",
      ],
    },
    {
      id: "heritage",
      nom: "Heritage",
      prix: "€390",
      prixCentimes: 39000,
      periode: "for one event",
      pitch: "All of the digital, plus the printed objects that remain once the gallery has closed.",
      resume:
        "Everything in Souvenir, plus the large printed photo album and fifty copies of your event newspaper.",
      herite: "Everything in Souvenir, plus:",
      cta: "Choose Heritage",
      points: [
        "The large-format 30 × 30 printed photo album (€249 on its own)",
        "Your event newspaper, 50 copies (€149 on its own)",
        "Layout done by us, approved by you before printing",
      ],
    },
  ],
};

export const formule = (lang: Lang, id: PlanId) =>
  FORMULES[lang].find((f) => f.id === id) ?? FORMULES[lang][0];
