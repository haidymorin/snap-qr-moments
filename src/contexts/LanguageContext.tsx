import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "fr" | "en";

type Dict = Record<string, any>;

const translations: Record<Lang, Dict> = {
  fr: {
    paid: {
      eyebrow: "Paiement reçu",
      title: "C'est noté. À vous de jouer.",
      body: "Créez votre compte avec l'adresse que vous venez d'utiliser : votre album et votre QR code vous attendent de l'autre côté.",
      cta: "Créer mon compte",
      reference: "Référence",
    },
    guest: {
      notFoundTitle: "Événement introuvable",
      notFoundText: "Vérifiez le lien ou le QR code.",
      takePhoto: "Prendre une photo",
      choosePhotos: "Choisir dans mes photos",
      hint1: "Photos et vidéos · vidéos jusqu'à 500 Mo, sans perte de qualité",
      hint2: "Plusieurs fichiers à la fois · aucune inscription",
      sendingTitle: "Envoi en cours",
      doneTitle: "Envoi terminé",
      preparing: "préparation",
      sending: "envoi",
      sent: "envoyé",
      waiting: "en attente",
      allSent: "Vos photos sont dans l'album.",
      retry: "Réessayer les fichiers en échec",
      dismiss: "Fermer",
      album: "Album partagé",
      tabAll: "Tout",
      tabPhotos: "Photos",
      tabVideos: "Vidéos",
      tabMine: "Photos de moi",
      tabEnvois: "Mes envois",
      selChoisir: "Sélectionner",
      selAnnuler: "Annuler",
      selChoisies: "sélectionnées",
      selTout: "Tout sélectionner",
      selAucune: "Tout désélectionner",
      selEnregistrer: "Enregistrer",
      emptyAll: "Aucune photo pour l'instant. La première peut être la vôtre.",
      emptyPhotos: "Aucune photo pour l'instant.",
      emptyVideos: "Aucune vidéo pour l'instant.",
      errTooBig: "image trop lourde, 25 Mo maximum",
      errVideoTooBig: "vidéo trop lourde, 500 Mo maximum",
      errServerTooBig: "fichier refusé car trop lourd — envoyez une vidéo plus courte",
      errFormat: "format non reconnu",
      errServeur: "le serveur n'a pas répondu, réessayez dans un instant",
      errNetwork: "connexion interrompue, réessayez",
      errDetail: "détail technique :",
      errRefused: "envoi refusé",
      download: "Enregistrer cette photo",
      downloading: "Préparation…",
      downloadFailed: "Téléchargement impossible, réessayez.",
      close: "Fermer",
      poweredBy: "Propulsé par QR Memories",
    },
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
      terms: "Conditions de vente",
    },
    notFound: {
      title: "Cette page n'existe pas",
      desc: "Le lien est peut-être ancien, ou l'adresse comporte une coquille. Si vous cherchiez à déposer vos photos, le lien de votre événement vous a été transmis par les organisateurs.",
      home: "Retour à l'accueil",
      pricing: "Voir les formules",
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
      objSoon: "Bientôt disponible",
      stepsAlt1: "Un cadre posé sur une table de mariage : « Partagez vos photos avec nous », avec un QR code à scanner.",
      stepsAlt2: "Quatre invités en tenue de soirée, téléphone en main, en train de déposer leurs photos.",
      stepsAlt3: "Un couple regarde sur une tablette la galerie de son mariage, remplie de photos.",
      gridFull: "Exemple · la galerie complète du mariage",
      gridMatched: "↓ Ce que Camille reçoit : les photos où elle apparaît",
      bandCaption: "Un vrai mariage, collecté avec QR Memories — juin 2026",
      mariageAltSortie: "Les mariés à la sortie de la mairie, entourés de leurs invités",
      mariageAltDanse: "La première danse des mariés",
      mariageAltSignature: "La signature du registre à la mairie",
      mariageAltVoiture: "La voiture des mariés devant l'hôtel de ville",

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
      quoteMeta: "Exemple · 22 h 14 · Table 3",

      plansEyebrow: "Ce que ça coûte",
      plansTitle: "Un prix par événement.",
      plansDesc:
        "Pas d'abonnement, pas de commission sur vos photos. Vous choisissez une fois, avant la soirée.",
      plan1Name: "Essentiel",
      plan1Price: "59 €",
      plan1Desc:
        "Le QR code, la galerie partagée, le tri automatique des ratés et la signalétique à imprimer. Photos gardées six mois.",
      plan2Name: "Souvenir",
      plan2Price: "179 €",
      plan2Badge: "Le plus choisi",
      plan2Desc:
        "Tout l'Essentiel, plus le livre d'or, le tri par visage et le diaporama projeté pendant la fête. Photos gardées six mois.",
      plan3Name: "Héritage",
      plan3Price: "390 €",
      plan3Desc:
        "Tout le Souvenir, plus l'album grand format et la gazette en cinquante exemplaires. Photos gardées six mois.",
      planDetail: "Le détail",

      objEyebrow: "Ce qu'il en reste",
      objTitle: "Un souvenir qui se touche.",
      objDesc:
        "Une galerie s'oublie au bout de six mois. Un objet posé sur une table, non. Tout se commande après l'événement, une fois les photos triées.",
      onQuote: "Sur devis",
      see: "Voir les tarifs",
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
        "Créez votre événement en deux minutes et recevez votre QR code tout de suite. Vous ne payez qu'au moment de l'ouvrir à vos invités.",
      finalCta: "Créer mon événement",
    },
    how: {
      eyebrow: "De la table au salon",
      title1: "Quatre moments,",
      title2: "et c'est tout.",
      subtitle:
        "Vous préparez le QR code avant la fête. Le reste se passe pendant la soirée, puis tout seul, pendant que vous dormez.",

      c1Num: "01 · Avant",
      c1Title: "Vous créez l'événement.",
      c1Desc:
        "Le nom, la date, et c'est prêt. Votre QR code arrive tout de suite, avec les fichiers à imprimer : le panneau d'accueil et les chevalets à poser sur les tables.",
      c1B1: "Deux minutes, sans configuration",
      c1B2: "Un QR code unique, aux couleurs de votre événement",
      c1B3: "La signalétique à imprimer, incluse dans tous les paliers",

      c2Num: "02 · Pendant",
      c2Title: "Vos invités déposent.",
      c2Desc:
        "Ils scannent le carton posé devant eux, la page s'ouvre, ils choisissent leurs photos. Pas d'application à installer, pas de compte à créer, pas de mot de passe à retenir.",
      c2B1: "Photos et vidéos illimitées",
      c2B2: "Fonctionne sur tous les téléphones, même les vieux",
      c2B3: "Le diaporama projeté pendant la soirée donne envie de participer",

      c3Num: "03 · La nuit même",
      c3Title: "L'IA fait le tri.",
      c3Desc:
        "Les doublons partent, les photos floues aussi, celles où personne ne regarde l'objectif également. Puis chaque invité prend un selfie et retrouve les photos où il apparaît.",
      c3B1: "Doublons, flous et ratés retirés automatiquement",
      c3B2: "Un selfie suffit pour retrouver ses propres photos",
      c3B3: "Les invités qui ne veulent pas être identifiés ne le sont pas",
      c3Caption: "Six photos retenues sur vingt-quatre, pour un invité donné.",

      c4Num: "04 · Après",
      c4Title: "Il en reste quelque chose.",
      c4Desc:
        "Une galerie s'oublie au bout de six mois. Un album posé sur une table, non. Vous commandez quand vous voulez, une fois les photos triées, et rien ne vous oblige à décider maintenant.",
      c4Link: "Voir ce que ça coûte",
      objA: "L'album",
      objB: "La gazette",
      objC: "Le PDF",

      ctaEyebrow: "Votre date approche",
      ctaTitle: "Vos invités prendront des photos. Autant les garder.",
      ctaDesc:
        "Créez votre événement et recevez votre QR code tout de suite. Vous ne payez qu'au moment de l'ouvrir aux invités.",
      ctaButton: "Créer mon événement",
    },
    pricing: {
      eyebrow: "Un prix par événement, pas d'abonnement",
      title: "Trois façons de garder votre soirée.",
      subtitle:
        "Vous payez une fois, pour un événement. Les objets imprimés se commandent après, une fois les photos triées.",
      extrasEyebrow: "À commander ensuite",
      extrasTitle: "Les objets, à la carte.",
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
    paid: {
      eyebrow: "Payment received",
      title: "All set. Over to you.",
      body: "Create your account with the email you just used: your album and your QR code are waiting on the other side.",
      cta: "Create my account",
      reference: "Reference",
    },
    guest: {
      notFoundTitle: "Event not found",
      notFoundText: "Check the link or the QR code.",
      takePhoto: "Take a photo",
      choosePhotos: "Choose from my photos",
      hint1: "Photos and videos · videos up to 500 MB, no quality loss",
      hint2: "Several files at once · no sign-up",
      sendingTitle: "Sending",
      doneTitle: "Upload finished",
      preparing: "preparing",
      sending: "sending",
      sent: "sent",
      waiting: "waiting",
      allSent: "Your photos are in the album.",
      retry: "Retry the files that failed",
      dismiss: "Close",
      album: "Shared album",
      tabAll: "All",
      tabPhotos: "Photos",
      tabVideos: "Videos",
      tabMine: "Photos of me",
      tabEnvois: "My uploads",
      selChoisir: "Select",
      selAnnuler: "Cancel",
      selChoisies: "selected",
      selTout: "Select all",
      selAucune: "Deselect all",
      selEnregistrer: "Save",
      emptyAll: "No photo yet. The first one could be yours.",
      emptyPhotos: "No photo yet.",
      emptyVideos: "No video yet.",
      errTooBig: "image too large, 25 MB maximum",
      errVideoTooBig: "video too large, 500 MB maximum",
      errServerTooBig: "file refused: too large — try a shorter video",
      errFormat: "format not recognised",
      errServeur: "the server did not answer, try again shortly",
      errNetwork: "connection lost",
      errDetail: "technical detail:",
      errRefused: "upload refused",
      download: "Save this photo",
      downloading: "Preparing…",
      downloadFailed: "Download failed, please try again.",
      close: "Close",
      poweredBy: "Powered by QR Memories",
    },
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
      terms: "Terms of sale",
    },
    notFound: {
      title: "This page doesn't exist",
      desc: "The link may be old, or the address may contain a typo. If you were looking to upload your photos, your event link was sent to you by the hosts.",
      home: "Back to home",
      pricing: "See the plans",
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
      objSoon: "Coming soon",
      stepsAlt1: "A frame on a wedding table reading “Share your photos with us”, with a QR code to scan.",
      stepsAlt2: "Four guests in evening dress, phone in hand, uploading their photos.",
      stepsAlt3: "A couple looking at their wedding gallery on a tablet, full of photos.",
      gridFull: "Example · the full wedding gallery",
      gridMatched: "↓ What Camille gets: the photos she appears in",
      bandCaption: "A real wedding, collected with QR Memories — June 2026",
      mariageAltSortie: "The couple leaving the town hall, surrounded by their guests",
      mariageAltDanse: "The couple's first dance",
      mariageAltSignature: "Signing the register at the town hall",
      mariageAltVoiture: "The wedding car in front of the town hall",

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
      quoteMeta: "Example · 10:14 PM · Table 3",

      plansEyebrow: "What it costs",
      plansTitle: "One price per event.",
      plansDesc:
        "No subscription, no commission on your photos. You choose once, before the night.",
      plan1Name: "Essential",
      plan1Price: "€59",
      plan1Desc:
        "The QR code, the shared gallery, automatic clean-up of the misfires and printable signage. Photos kept six months.",
      plan2Name: "Souvenir",
      plan2Price: "€179",
      plan2Badge: "Most chosen",
      plan2Desc:
        "Everything in Essential, plus the guest book, face sorting and the slideshow projected during the party. Photos kept six months.",
      plan3Name: "Heritage",
      plan3Price: "€390",
      plan3Desc:
        "Everything in Souvenir, plus the large-format album and fifty copies of the newspaper. Photos kept six months.",
      planDetail: "The detail",

      objEyebrow: "What is left of it",
      objTitle: "A memory you can hold.",
      objDesc:
        "A gallery is forgotten within six months. An object sitting on a table is not. Everything is ordered after the event, once the photos are sorted.",
      onQuote: "On request",
      see: "See pricing",
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
        "Create your event in two minutes and get your QR code straight away. You only pay when you open it to your guests.",
      finalCta: "Create my event",
    },
    how: {
      eyebrow: "From the table to the living room",
      title1: "Four moments,",
      title2: "and that's it.",
      subtitle:
        "You set the QR code up before the party. The rest happens during the night, then on its own, while you sleep.",

      c1Num: "01 · Before",
      c1Title: "You create the event.",
      c1Desc:
        "The name, the date, and it's ready. Your QR code arrives straight away, along with the files to print: the welcome sign and the cards to stand on the tables.",
      c1B1: "Two minutes, no setup",
      c1B2: "A unique QR code, in your event's colours",
      c1B3: "Printable signage, included in every plan",

      c2Num: "02 · During",
      c2Title: "Your guests upload.",
      c2Desc:
        "They scan the card in front of them, the page opens, they pick their photos. No app to install, no account to create, no password to remember.",
      c2B1: "Unlimited photos and videos",
      c2B2: "Works on every phone, even the old ones",
      c2B3: "The slideshow running during the party makes people want to join in",

      c3Num: "03 · That same night",
      c3Title: "The AI sorts it out.",
      c3Desc:
        "Duplicates go, so do the blurry shots and the ones where nobody is looking at the lens. Then each guest takes a selfie and finds the photos they appear in.",
      c3B1: "Duplicates, blur and misfires removed automatically",
      c3B2: "One selfie is enough to find your own photos",
      c3B3: "Guests who would rather not be identified simply aren't",
      c3Caption: "Six photos kept out of twenty-four, for one given guest.",

      c4Num: "04 · After",
      c4Title: "Something is left of it.",
      c4Desc:
        "A gallery is forgotten within six months. An album sitting on a table is not. You order whenever you like, once the photos are sorted, and nothing forces you to decide now.",
      c4Link: "See what it costs",
      objA: "The album",
      objB: "The newspaper",
      objC: "The PDF",

      ctaEyebrow: "Your date is coming up",
      ctaTitle: "Your guests will take photos. You may as well keep them.",
      ctaDesc:
        "Create your event and get your QR code right away. You only pay when you open it to your guests.",
      ctaButton: "Create my event",
    },
    pricing: {
      eyebrow: "One price per event, no subscription",
      title: "Three ways to keep your night.",
      subtitle:
        "You pay once, for one event. Printed objects are ordered afterwards, once the photos are sorted.",
      extrasEyebrow: "Order afterwards",
      extrasTitle: "The objects, à la carte.",
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
