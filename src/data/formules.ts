import { type PlanId } from "@/lib/checkout";
import { type Lang } from "@/contexts/LanguageContext";

/* Le contenu des trois formules, en un seul endroit.
 *
 * Il était écrit trois fois — sur la page d'accueil, sur la page des tarifs,
 * dans le formulaire de commande — et les trois versions avaient déjà commencé
 * à diverger. Une personne qui lit « le tri » sur une page et « le nettoyage
 * automatique » sur la suivante ne sait pas si c'est la même chose.
 *
 * Le vocabulaire est celui d'une personne qui n'a jamais vu le produit. On
 * écrit « QR code », pas « QR ». On écrit « galerie en ligne », et on dit ce
 * que c'est. Chaque ligne répond à la question « concrètement, il se passe
 * quoi ? » — sans devenir une notice.
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
  points: { titre: string; detail: string }[];
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
        {
          titre: "Votre QR code personnalisé",
          detail:
            "Le petit carré à scanner avec un téléphone. Vous l'imprimez et vous le posez sur les tables.",
        },
        {
          titre: "Aucune application à installer pour vos invités",
          detail:
            "Ils dirigent l'appareil photo de leur téléphone vers le QR code, une page s'ouvre, ils envoient leurs photos. Pas de compte à créer, pas de mot de passe.",
        },
        {
          titre: "Une galerie en ligne privée",
          detail:
            "Une page web à vous seuls, où toutes les photos et toutes les vidéos arrivent au fur et à mesure de la soirée. Sans limite de nombre.",
        },
        {
          titre: "Vos invités récupèrent aussi les photos des autres",
          detail:
            "En qualité d'origine, sans perte. Chacun repart avec les photos où il se trouve, même celles prises par quelqu'un d'autre.",
        },
        {
          titre: "Le tri automatique des doublons et des photos floues",
          detail:
            "Les cinq photos identiques d'une même rafale et les photos bougées sont mises de côté. Rien n'est effacé : vous pouvez les revoir d'un bouton.",
        },
        {
          titre: "Les affiches à imprimer, prêtes à l'emploi",
          detail:
            "Un fichier PDF avec le panneau d'accueil et les petits chevalets à poser sur chaque table. Vous les imprimez chez vous ou chez un imprimeur.",
        },
        {
          titre: "Tout télécharger en un clic, et six mois pour le faire",
          detail:
            "L'album entier en un seul fichier, quand vous voulez. La galerie reste en ligne six mois après votre événement.",
        },
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
        {
          titre: "Le livre d'or numérique",
          detail:
            "Depuis le même QR code, vos invités vous laissent un mot écrit, un message vocal ou une petite vidéo. Vous les retrouvez à côté des photos.",
        },
        {
          titre: "La recherche par visage",
          detail:
            "Un invité prend un selfie et retrouve aussitôt toutes les photos où il apparaît, sans faire défiler les huit cents autres. C'est facultatif : personne n'y est obligé.",
        },
        {
          titre: "Le diaporama en direct",
          detail:
            "Les photos s'affichent au fur et à mesure sur un écran ou un vidéoprojecteur pendant la soirée. Il suffit d'ouvrir une page web sur l'ordinateur relié à l'écran.",
        },
        {
          titre: "Vos couleurs et votre nom partout",
          detail:
            "La page que voient vos invités, le QR code et les affiches reprennent le nom de votre événement et les couleurs que vous choisissez.",
        },
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
        {
          titre: "L'album photo imprimé, grand format",
          detail:
            "30 × 30 cm, papier épais, couverture toilée, s'ouvre bien à plat. Vos photos et les mots de vos invités en vis-à-vis. Commandé seul, il coûte 249 €.",
        },
        {
          titre: "La gazette de votre événement, 50 exemplaires",
          detail:
            "Un petit journal de quatre pages qui raconte votre journée, à distribuer à vos invités. Commandée seule, elle coûte 149 €.",
        },
        {
          titre: "La mise en page est faite par nous",
          detail:
            "Nous choisissons et plaçons les photos, vous relisez tout et vous validez avant l'impression. Vous ne touchez à aucun logiciel.",
        },
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
        {
          titre: "Your own QR code",
          detail: "The little square you scan with a phone. You print it and put it on the tables.",
        },
        {
          titre: "No app for your guests to install",
          detail:
            "They point their phone camera at the QR code, a page opens, they send their photos. No account, no password.",
        },
        {
          titre: "A private online gallery",
          detail:
            "A web page of your own where every photo and video lands as the evening goes on. No limit on how many.",
        },
        {
          titre: "Guests can save each other's photos too",
          detail:
            "At full original quality. Everyone leaves with the photos they are in, including the ones somebody else took.",
        },
        {
          titre: "Automatic sorting of duplicates and blurry shots",
          detail:
            "Five near-identical frames from one burst, and shaken photos, are set aside. Nothing is deleted: one button brings them back.",
        },
        {
          titre: "Printable signs, ready to use",
          detail:
            "A PDF with the welcome sign and the little table cards. Print them at home or at a print shop.",
        },
        {
          titre: "Download everything in one click, six months to do it",
          detail:
            "The whole album as a single file, whenever you like. The gallery stays online for six months after your event.",
        },
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
        {
          titre: "The digital guest book",
          detail:
            "From the same QR code, guests leave you a written note, a voice message or a short video. You find them next to the photos.",
        },
        {
          titre: "Face search",
          detail:
            "A guest takes a selfie and immediately finds every photo they appear in, without scrolling past the other eight hundred. It is optional.",
        },
        {
          titre: "The live slideshow",
          detail:
            "Photos appear on a screen or projector as they arrive. Just open a web page on the computer wired to the screen.",
        },
        {
          titre: "Your colours and your name throughout",
          detail:
            "The page your guests see, the QR code and the signs all carry your event's name and the colours you choose.",
        },
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
        {
          titre: "The large printed photo album",
          detail:
            "30 × 30 cm, heavy paper, cloth cover, lies flat when open. Your photos facing your guests' words. On its own it costs €249.",
        },
        {
          titre: "Your event newspaper, 50 copies",
          detail:
            "A four-page paper telling the story of your day, to hand out to guests. On its own it costs €149.",
        },
        {
          titre: "We do the layout",
          detail:
            "We pick and place the photos, you read it all and approve before printing. You never open a design tool.",
        },
      ],
    },
  ],
};

export const formule = (lang: Lang, id: PlanId) =>
  FORMULES[lang].find((f) => f.id === id) ?? FORMULES[lang][0];
