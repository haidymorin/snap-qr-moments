import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

/* Une application d'une seule page ne change ni son titre, ni sa description,
   ni son adresse canonique quand on navigue : tout le site partage le contenu
   de index.html. Google indexe alors dix pages sous le même titre, et un lien
   partagé sur WhatsApp affiche la même vignette où qu'il pointe.

   Ce composant corrige cela à chaque changement de route, et remonte la page
   en haut — ou à l'ancre visée, sans quoi /pricing#faq n'irait nulle part. */

const SITE = "https://qr-memories.fr";

type Meta = { title: string; desc: string; noindex?: boolean };

const META: Record<string, { fr: Meta; en: Meta }> = {
  "/": {
    fr: {
      title: "QR Memories · Toutes les photos de votre mariage, prises par vos invités",
      desc: "Un QR code sur les tables, vos invités déposent leurs photos sans installer d'application. Le tri se fait tout seul, et il en reste un album que vous gardez.",
    },
    en: {
      title: "QR Memories · Every photo of your wedding, taken by your guests",
      desc: "A QR code on the tables, your guests upload their photos with no app to install. Sorting happens on its own, and an album remains.",
    },
  },
  "/how-it-works": {
    fr: {
      title: "Comment ça marche · QR Memories",
      desc: "Le QR code, la collecte pendant la soirée, le tri par intelligence artificielle, la galerie et les objets imprimés : le déroulé complet, étape par étape.",
    },
    en: {
      title: "How it works · QR Memories",
      desc: "The QR code, collecting during the party, AI-powered sorting, the gallery and the printed keepsakes: the full sequence, step by step.",
    },
  },
  "/pricing": {
    fr: {
      title: "Formules et tarifs · QR Memories",
      desc: "Essentiel 59 €, Souvenir 179 €, Héritage 390 €. Album, gazette et objets imprimés à la carte. Sans abonnement, sans application.",
    },
    en: {
      title: "Plans and pricing · QR Memories",
      desc: "Essential €59, Souvenir €179, Heritage €390. Album, newspaper and printed keepsakes à la carte. No subscription, no app.",
    },
  },
  "/contact": {
    fr: {
      title: "Nous écrire · QR Memories",
      desc: "Une question sur votre mariage, une date à réserver, un devis à recevoir : écrivez-nous, réponse sous 5 jours ouvrés.",
    },
    en: {
      title: "Contact us · QR Memories",
      desc: "A question about your wedding, a date to book, a quote to receive: write to us, answer within 5 working days.",
    },
  },
  "/cgv": {
    fr: {
      title: "Conditions générales de vente · QR Memories",
      desc: "Ce que vous achetez, ce que nous livrons, dans quels délais, et ce qui se passe si votre événement est reporté.",
    },
    en: {
      title: "Terms of sale · QR Memories",
      desc: "What you buy, what we deliver, within what time, and what happens if your event is postponed.",
    },
  },
  "/legal": {
    fr: { title: "Mentions légales · QR Memories", desc: "Éditeur, hébergeur, contact et propriété intellectuelle." },
    en: { title: "Legal notice · QR Memories", desc: "Publisher, host, contact and intellectual property." },
  },
  "/privacy": {
    fr: {
      title: "Confidentialité · QR Memories",
      desc: "Quelles données nous traitons, combien de temps, et comment la reconnaissance des visages repose sur un consentement individuel.",
    },
    en: {
      title: "Privacy · QR Memories",
      desc: "What data we process, for how long, and how face recognition relies on individual consent.",
    },
  },
};

/* Les espaces privés et les galeries d'invités n'ont rien à faire dans un
   moteur de recherche : une galerie de mariage indexée serait une fuite. */
const PRIVE = ["/dashboard", "/admin", "/auth", "/event/", "/paiement-reussi"];

const poser = (selecteur: string, creer: () => HTMLElement, valeur: string) => {
  let el = document.head.querySelector(selecteur) as HTMLElement | null;
  if (!el) {
    el = creer();
    document.head.appendChild(el);
  }
  if (el.tagName === "META") el.setAttribute("content", valeur);
  else el.setAttribute("href", valeur);
};

const RouteEffects = () => {
  const { pathname, hash } = useLocation();
  const { lang } = useLanguage();

  useEffect(() => {
    const prive = PRIVE.some((p) => pathname.startsWith(p));
    const m = META[pathname]?.[lang] ?? META["/"][lang];

    document.title = m.title;
    document.documentElement.lang = lang;

    poser('meta[name="description"]', () => {
      const e = document.createElement("meta");
      e.setAttribute("name", "description");
      return e;
    }, m.desc);

    poser('meta[property="og:title"]', () => {
      const e = document.createElement("meta");
      e.setAttribute("property", "og:title");
      return e;
    }, m.title);

    poser('meta[property="og:description"]', () => {
      const e = document.createElement("meta");
      e.setAttribute("property", "og:description");
      return e;
    }, m.desc);

    poser('meta[name="twitter:title"]', () => {
      const e = document.createElement("meta");
      e.setAttribute("name", "twitter:title");
      return e;
    }, m.title);

    poser('meta[name="twitter:description"]', () => {
      const e = document.createElement("meta");
      e.setAttribute("name", "twitter:description");
      return e;
    }, m.desc);

    const url = SITE + (pathname === "/" ? "/" : pathname);
    poser('link[rel="canonical"]', () => {
      const e = document.createElement("link");
      e.setAttribute("rel", "canonical");
      return e;
    }, url);

    poser('meta[property="og:url"]', () => {
      const e = document.createElement("meta");
      e.setAttribute("property", "og:url");
      return e;
    }, url);

    poser('meta[property="og:locale"]', () => {
      const e = document.createElement("meta");
      e.setAttribute("property", "og:locale");
      return e;
    }, lang === "fr" ? "fr_FR" : "en_GB");

    const robots = document.head.querySelector('meta[name="robots"]');
    if (prive || META[pathname] === undefined) {
      poser('meta[name="robots"]', () => {
        const e = document.createElement("meta");
        e.setAttribute("name", "robots");
        return e;
      }, "noindex, nofollow");
    } else if (robots) {
      robots.remove();
    }
  }, [pathname, lang]);

  useEffect(() => {
    if (hash) {
      const cible = document.querySelector(hash);
      if (cible) {
        cible.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
};

export default RouteEffects;
