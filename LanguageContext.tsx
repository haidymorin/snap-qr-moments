import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "fr" | "en";

type Dict = Record<string, any>;

const translations: Record<Lang, Dict> = {
  fr: {
    nav: {
      home: "Accueil",
      how: "Fonctionnement",
      pricing: "Tarifs",
      contact: "Contact",
      dashboard: "Mon dashboard",
      cta: "Créer mon événement",
      signOut: "Déconnexion",
    },
    footer: {
      tagline: "Partagez les souvenirs de vos événements en toute simplicité.",
      navigation: "Navigation",
      support: "Support",
      legal: "Légal",
      faq: "FAQ",
      legalNotice: "Mentions légales",
      privacy: "Confidentialité",
      madeWith: "Fait avec",
      by: "par QR Memories",
    },
    home: {
      counterSingular: "photo déposée",
      counterPlural: "photos déposées",
      replay: "↻ Rejouer",

      heroEyebrow: "Le mariage vu par vos invités",
      heroTitle1: "Leurs photos, leurs mots,",
      heroTitle2: "votre album.",
      heroSubtitle:
        "Un QR code sur les tables. Vos invités déposent leurs photos sans rien installer, le tri se fait tout seul, et il en reste un objet que vous gardez.",
      ctaCreate: "Créer mon événement",
      ctaDiscover: "Voir comment ça marche",

      stepsEyebrow: "Sans application, sans compte",
      stepsTitle1: "Rien à installer,",
      stepsTitle2: "rien à demander.",
      step1Num: "01 · AVANT",
      step1Title: "Vous posez le QR",
      step1Desc:
        "Un panneau à l'entrée et un petit carton sur chaque table. Nous fournissons les fichiers à imprimer, aux couleurs de votre événement.",
      step2Num: "02 · PENDANT",
      step2Title: "Ils déposent, ça s'affiche",
      step2Desc:
        "Vos invités scannent et envoient. Aucune application, aucun compte à créer. Le diaporama projette les photos en direct sur grand écran.",
      step3Num: "03 · APRÈS",
      step3Title: "Le tri se fait tout seul",
      step3Desc:
        "Les doublons et les photos ratées disparaissent. Chaque invité retrouve celles où il apparaît, et vous n'avez plus qu'à choisir l'objet.",

      aiEyebrow: "Le tri par intelligence artificielle",
      aiTitle1: "Trois cents photos.",
      aiTitle2: "Les vôtres, en trente secondes.",
      aiDesc:
        "L'IA écarte les doublons, les flous et les photos ratées. Elle reconnaît ensuite les visages, et chaque invité repart avec sa propre galerie sans avoir créé de compte.",
      selfieTitle: "« Prenez-vous en photo »",
      selfieDesc:
        "Un selfie, et vous récupérez toutes vos photos de la soirée. C'est aussi votre accord : sans lui, votre visage n'est jamais analysé.",
      aiCta: "Essayer sur mon événement",
      gridFull: "Galerie complète · 247 photos",
      gridMatched: "↓ Après reconnaissance · 34 photos de Camille",

      guestbookEyebrow: "Le livre d'or",
      guestbookTitle1: "Ce que personne",
      guestbookTitle2: "n'ose dire à voix haute.",
      guestbookP1:
        "Sur la même page, vos invités laissent un mot. Écrit, en voix, ou en vidéo. Chaque message est relié à son auteur, et dans l'album leurs mots se posent en face de leur photo.",
      guestbookP2:
        "Un message vocal ne s'imprime pas. Alors un petit QR s'imprime à sa place. Dix ans plus tard, vous scannez la page et vous entendez sa voix.",
      quoteText:
        "Ma chérie, je n'ai pas trouvé les mots hier soir. Alors je te les écris ici, pendant que tu danses.",
      quoteAuthor: "Jeanne, sa grand-mère",
      quoteMeta: "22 h 14 · Table 3",

      objEyebrow: "Ce qu'il en reste",
      objTitle: "Un souvenir qui se touche.",
      objDesc:
        "Une galerie s'oublie au bout de six mois. Un objet posé sur une table, non. Tout se commande après l'événement, une fois les photos triées.",
      onQuote: "Sur devis",
      see: "Voir",
      obj1Tag: "Le lendemain",
      obj1Title: "L'album PDF",
      obj1Desc:
        "Vos meilleures photos mises en page, prêtes à envoyer à vos proches dès le lendemain de la fête.",
      obj2Tag: "Le plus vendu",
      obj2Title: "L'album souvenir",
      obj2Desc:
        "Format carré 20×20, couverture souple, 40 pages. Vos photos et les mots de vos invités en regard.",
      obj3Tag: "À offrir",
      obj3Title: "La gazette",
      obj3Desc:
        "Le journal de votre mariage, à distribuer à vos invités. Votre journée racontée sur quatre pages.",
      obj4Tag: "L'objet",
      obj4Title: "Le grand album",
      obj4Desc:
        "Format 30×30 qui s'ouvre à plat, papier épais, couverture toilée. Fabriqué par un imprimeur de photographes.",

      finalEyebrow: "Votre date approche",
      finalTitle: "Vos invités prendront des photos. Autant les garder.",
      finalDesc:
        "Créez votre événement en deux minutes et recevez votre QR code tout de suite. Le premier est gratuit.",
      finalCta: "Créer mon événement",
    },
    how: {
      title1: "Comment ça",
      title2: "fonctionne",
      title3: "?",
      subtitle:
        "QR Memories simplifie le partage de photos lors de vos événements. Découvrez comment en 3 étapes simples.",
      step1Title: "Créez votre événement",
      step1Desc:
        "Inscrivez-vous en quelques secondes et créez votre événement. Indiquez le nom, la date, et personnalisez votre QR Code.",
      step1B1: "Obtenez votre QR Code unique",
      step1B2: "Invitez autant de personnes que vous voulez",
      step2Title: "Vos invités participent",
      step2Desc:
        "Partagez le QR Code (affiché à l'événement, envoyé par mail, etc.). Vos invités le scannent et partagent leurs photos instantanément.",
      step2B1: "Aucune application à télécharger",
      step2B2: "Fonctionne sur tous les smartphones",
      step3Title: "Profitez de vos souvenirs",
      step3Desc:
        "Accédez à toutes les photos dans votre espace personnel. Téléchargez-les, créez des albums personnalisés ou générez un diaporama automatique.",
      step3B1: "Téléchargement en masse",
      step3B2: "Création de clips vidéo automatiques",
      step3B3: "Sélection de vos favoris",
      ctaTitle: "Convaincu ? Créez votre premier événement !",
      ctaButton: "Commencer gratuitement",
    },
    pricing: {
      title: "Des tarifs simples et transparents",
      subtitle: "Commencez gratuitement. Upgradez quand vous en avez besoin.",
      tabIndiv: "Particuliers",
      tabPro: "Professionnels",
      addonsTitle: "Personnalisez votre expérience",
      addonsSubtitle: "Des options sans engagement pour aller plus loin.",
      faqTitle: "Questions fréquentes",
      soon: "Bientôt",
      recommended: "Recommandé",
      popular: "Populaire",
      perEvent: "événement",
      perMonth: "mois",
      free: "Gratuit",
      agencyTitle: "Agence & Revendeur",
      agencyPrice: "Tarif sur devis",
      agencyB1: "Accès multi-utilisateurs",
      agencyB2: "Intégration à vos outils",
      agencyB3: "Facturation en marque blanche",
      agencyB4: "Compte manager dédié",
      agencyCta: "Rejoindre la liste d'attente",
    },
    auth: {
      welcome: "Bienvenue sur",
      subtitle: "Créez et gérez vos albums événements",
      signup: "Inscription",
      signin: "Connexion",
      fullName: "Nom complet",
      email: "Email",
      password: "Mot de passe",
      confirmPassword: "Confirmer le mot de passe",
      placeholderName: "Jean Dupont",
      placeholderPw: "6 caractères minimum",
      placeholderPwConfirm: "Retapez votre mot de passe",
      createAccount: "Créer mon compte",
      creating: "Création...",
      signInBtn: "Se connecter",
      signingIn: "Connexion...",
      showPw: "Afficher le mot de passe",
      hidePw: "Masquer le mot de passe",
      mismatch: "Les mots de passe ne correspondent pas",
      checkEmailTitle: "Vérifiez votre boîte mail",
      checkEmailDesc:
        "Un email de confirmation vous a été envoyé. Vérifiez votre boîte mail avant de vous connecter.",
      backToSignIn: "Retour à la connexion",
      errorTitle: "Erreur",
      errorGeneric: "Une erreur est survenue",
      errorInvalidCreds: "Email ou mot de passe incorrect. Vérifiez que votre email est bien confirmé.",
      welcomeBack: "Bienvenue !",
      welcomeBackDesc: "Connexion réussie.",
    },
  },
  en: {
    nav: {
      home: "Home",
      how: "How it works",
      pricing: "Pricing",
      contact: "Contact",
      dashboard: "My dashboard",
      cta: "Create my event",
      signOut: "Sign out",
    },
    footer: {
      tagline: "Share your event memories with effortless simplicity.",
      navigation: "Navigation",
      support: "Support",
      legal: "Legal",
      faq: "FAQ",
      legalNotice: "Legal notice",
      privacy: "Privacy",
      madeWith: "Made with",
      by: "by QR Memories",
    },
    home: {
      counterSingular: "photo uploaded",
      counterPlural: "photos uploaded",
      replay: "↻ Replay",

      heroEyebrow: "The wedding, seen by your guests",
      heroTitle1: "Their photos, their words,",
      heroTitle2: "your album.",
      heroSubtitle:
        "A QR code on the tables. Your guests upload their photos without installing anything, the sorting happens on its own, and you keep something real at the end.",
      ctaCreate: "Create my event",
      ctaDiscover: "See how it works",

      stepsEyebrow: "No app, no account",
      stepsTitle1: "Nothing to install,",
      stepsTitle2: "nothing to ask for.",
      step1Num: "01 · BEFORE",
      step1Title: "You put up the QR",
      step1Desc:
        "One sign at the entrance and a small card on every table. We give you the print files, in your event colours.",
      step2Num: "02 · DURING",
      step2Title: "They upload, it appears",
      step2Desc:
        "Your guests scan and send. No app, no account to create. The live slideshow puts the photos on the big screen as they arrive.",
      step3Num: "03 · AFTER",
      step3Title: "The sorting happens on its own",
      step3Desc:
        "Duplicates and bad shots disappear. Every guest finds the photos they appear in, and all you have to do is pick the object.",

      aiEyebrow: "Sorting by artificial intelligence",
      aiTitle1: "Three hundred photos.",
      aiTitle2: "Yours, in thirty seconds.",
      aiDesc:
        "The AI removes duplicates, blurred shots and misfires. It then recognises faces, and every guest leaves with their own gallery without ever creating an account.",
      selfieTitle: "\u201cTake a photo of yourself\u201d",
      selfieDesc:
        "One selfie, and you get back every photo of you from the night. It is also your consent: without it, your face is never analysed.",
      aiCta: "Try it on my event",
      gridFull: "Full gallery · 247 photos",
      gridMatched: "↓ After recognition · 34 photos of Camille",

      guestbookEyebrow: "The guest book",
      guestbookTitle1: "What nobody",
      guestbookTitle2: "dares say out loud.",
      guestbookP1:
        "On the same page, your guests leave a message. Written, spoken, or filmed. Each one is linked to its author, and in the album their words sit next to their photo.",
      guestbookP2:
        "A voice message cannot be printed. So a small QR is printed in its place. Ten years later, you scan the page and you hear her voice.",
      quoteText:
        "My darling, I could not find the words last night. So I am writing them here, while you dance.",
      quoteAuthor: "Jeanne, her grandmother",
      quoteMeta: "10:14 PM · Table 3",

      objEyebrow: "What is left of it",
      objTitle: "A memory you can hold.",
      objDesc:
        "A gallery is forgotten within six months. An object sitting on a table is not. Everything is ordered after the event, once the photos are sorted.",
      onQuote: "On request",
      see: "See",
      obj1Tag: "Next morning",
      obj1Title: "The PDF album",
      obj1Desc:
        "Your best photos laid out, ready to send to your family the morning after the party.",
      obj2Tag: "Best seller",
      obj2Title: "The keepsake album",
      obj2Desc:
        "Square 20×20, soft cover, 40 pages. Your photos and your guests' words side by side.",
      obj3Tag: "To give away",
      obj3Title: "The newspaper",
      obj3Desc:
        "Your wedding as a newspaper, to hand out to your guests. Your day told across four pages.",
      obj4Tag: "The object",
      obj4Title: "The large album",
      obj4Desc:
        "30×30 layflat, thick paper, cloth cover. Made by a printer who works for photographers.",

      finalEyebrow: "Your date is coming",
      finalTitle: "Your guests will take photos. You may as well keep them.",
      finalDesc:
        "Create your event in two minutes and get your QR code straight away. The first one is free.",
      finalCta: "Create my event",
    },
    how: {
      title1: "How it",
      title2: "works",
      title3: "",
      subtitle:
        "QR Memories makes photo sharing at your events effortless. Discover how in 3 simple steps.",
      step1Title: "Create your event",
      step1Desc:
        "Sign up in seconds and create your event. Set the name, the date, and customize your QR Code.",
      step1B1: "Get your unique QR Code",
      step1B2: "Invite as many guests as you want",
      step2Title: "Your guests join in",
      step2Desc:
        "Share the QR Code (displayed at the venue, sent by email, etc.). Guests scan it and share their photos instantly.",
      step2B1: "No app to download",
      step2B2: "Works on every smartphone",
      step3Title: "Enjoy your memories",
      step3Desc:
        "Access every photo in your private space. Download them, create custom albums, or generate an automatic slideshow.",
      step3B1: "Bulk download",
      step3B2: "Automatic video clip creation",
      step3B3: "Select your favorites",
      ctaTitle: "Convinced? Create your first event!",
      ctaButton: "Start for free",
    },
    pricing: {
      title: "Simple, transparent pricing",
      subtitle: "Start for free. Upgrade whenever you need to.",
      tabIndiv: "Individuals",
      tabPro: "Professionals",
      addonsTitle: "Personalize your experience",
      addonsSubtitle: "Commitment-free options to go further.",
      faqTitle: "Frequently asked questions",
      soon: "Coming soon",
      recommended: "Recommended",
      popular: "Popular",
      perEvent: "event",
      perMonth: "month",
      free: "Free",
      agencyTitle: "Agency & Reseller",
      agencyPrice: "Custom quote",
      agencyB1: "Multi-user access",
      agencyB2: "Integration with your tools",
      agencyB3: "White-label invoicing",
      agencyB4: "Dedicated account manager",
      agencyCta: "Join the waitlist",
    },
    auth: {
      welcome: "Welcome to",
      subtitle: "Create and manage your event albums",
      signup: "Sign up",
      signin: "Sign in",
      fullName: "Full name",
      email: "Email",
      password: "Password",
      confirmPassword: "Confirm password",
      placeholderName: "John Doe",
      placeholderPw: "6 characters minimum",
      placeholderPwConfirm: "Re-enter your password",
      createAccount: "Create my account",
      creating: "Creating...",
      signInBtn: "Sign in",
      signingIn: "Signing in...",
      showPw: "Show password",
      hidePw: "Hide password",
      mismatch: "Passwords do not match",
      checkEmailTitle: "Check your inbox",
      checkEmailDesc:
        "A confirmation email has been sent to you. Please check your inbox before signing in.",
      backToSignIn: "Back to sign in",
      errorTitle: "Error",
      errorGeneric: "Something went wrong",
      errorInvalidCreds: "Incorrect email or password. Make sure your email is confirmed.",
      welcomeBack: "Welcome back!",
      welcomeBackDesc: "Successfully signed in.",
    },
  },
};

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "fr";
    const stored = localStorage.getItem("lang");
    return stored === "en" || stored === "fr" ? stored : "fr";
  });

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("lang", l);
  };

  const t = (key: string): string => {
    const parts = key.split(".");
    let cur: any = translations[lang];
    for (const p of parts) {
      if (cur && typeof cur === "object" && p in cur) cur = cur[p];
      else return key;
    }
    return typeof cur === "string" ? cur : key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
