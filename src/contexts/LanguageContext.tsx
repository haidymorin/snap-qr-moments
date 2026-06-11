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
      heroTitle1: "Scannez. Partagez.",
      heroTitle2: "Revivez vos souvenirs.",
      heroSubtitle:
        "Collectez et partagez les photos de vos événements via un simple QR Code. Pas d'application, juste de la magie.",
      ctaCreate: "Créer mon album événement",
      ctaDiscover: "Découvrir comment ça marche",
      simpleTitle: "Simple comme",
      simpleNumbers: "1, 2, 3",
      simpleSubtitle:
        "En quelques secondes, créez votre album partagé et récupérez tous les souvenirs de vos invités.",
      step1Title: "Créez votre événement",
      step1Desc:
        "En quelques clics, configurez votre album événement et obtenez un QR Code unique à partager.",
      step2Title: "Vos invités scannent",
      step2Desc:
        "Ils scannent le QR Code et partagent leurs photos instantanément, sans télécharger d'application.",
      step3Title: "Profitez de vos souvenirs",
      step3Desc:
        "Toutes les photos apparaissent dans votre album partagé. Téléchargez-les ou créez un diaporama.",
      whyTitle: "Pourquoi choisir",
      benefit1Title: "Ultra simple",
      benefit1Desc: "Pas d'application à télécharger. Un simple scan suffit.",
      benefit2Title: "Photos illimitées",
      benefit2Desc: "Collectez autant de photos que vous le souhaitez.",
      benefit3Title: "Partage instantané",
      benefit3Desc: "Accédez à tous vos souvenirs en temps réel.",
      proTitle: "Vous êtes",
      proHighlight: "photographe ou wedding planner",
      proQuestion: "?",
      proDesc:
        "QR Memories s'intègre directement à votre offre. Proposez à vos clients un espace de collecte photos brandé à votre nom, sans effort supplémentaire. Simplifiez votre livraison de galeries et devenez prescripteur.",
      proCta: "Découvrir l'offre Pro",
      proF1Title: "Multi-événements",
      proF1Desc: "Gérez tous vos clients en un seul espace.",
      proF2Title: "Branding personnalisé",
      proF2Desc: "Vos couleurs, votre logo, votre identité.",
      proF3Title: "Galerie pro",
      proF3Desc: "Livraison soignée et expérience client premium.",
      finalCtaTitle: "Prêt à immortaliser votre événement ?",
      finalCtaDesc:
        "Rejoignez des milliers d'organisateurs qui ont déjà choisi QR Memories pour leurs événements.",
      finalCta: "Créer mon événement gratuitement",
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
      errorInvalidCreds: "Identifiants invalides",
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
      heroTitle1: "Scan. Share.",
      heroTitle2: "Relive your memories.",
      heroSubtitle:
        "Collect and share photos from your events through a simple QR Code. No app — just magic.",
      ctaCreate: "Create my event album",
      ctaDiscover: "See how it works",
      simpleTitle: "As simple as",
      simpleNumbers: "1, 2, 3",
      simpleSubtitle:
        "In seconds, create your shared album and gather every memory captured by your guests.",
      step1Title: "Create your event",
      step1Desc:
        "In a few clicks, set up your event album and get a unique QR Code to share.",
      step2Title: "Your guests scan",
      step2Desc:
        "They scan the QR Code and share their photos instantly — no app download required.",
      step3Title: "Enjoy your memories",
      step3Desc:
        "Every photo appears in your shared album. Download them all or create a slideshow.",
      whyTitle: "Why choose",
      benefit1Title: "Effortlessly simple",
      benefit1Desc: "No app to download. A simple scan is all it takes.",
      benefit2Title: "Unlimited photos",
      benefit2Desc: "Collect as many photos as you want.",
      benefit3Title: "Instant sharing",
      benefit3Desc: "Access all your memories in real time.",
      proTitle: "Are you a",
      proHighlight: "photographer or wedding planner",
      proQuestion: "?",
      proDesc:
        "QR Memories integrates seamlessly into your offer. Provide your clients with a photo collection space branded with your identity — no extra effort required. Simplify gallery delivery and become the trusted recommendation.",
      proCta: "Discover the Pro plan",
      proF1Title: "Multi-events",
      proF1Desc: "Manage all your clients in one place.",
      proF2Title: "Custom branding",
      proF2Desc: "Your colors, your logo, your identity.",
      proF3Title: "Pro gallery",
      proF3Desc: "Polished delivery and premium client experience.",
      finalCtaTitle: "Ready to immortalize your event?",
      finalCtaDesc:
        "Join thousands of organizers who have already chosen QR Memories for their events.",
      finalCta: "Create my event for free",
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
      errorInvalidCreds: "Invalid credentials",
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
