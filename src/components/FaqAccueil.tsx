import { useLanguage, Lang } from "@/contexts/LanguageContext";

/* Les questions fréquentes, ramenées sur l'accueil.
 *
 * Elles vivaient en bas de la page des tarifs, c'est-à-dire au bout d'une page
 * que l'on quitte dès qu'on a vu les trois prix. Or ce ne sont pas des
 * questions de tarif : ce sont les questions qu'on se pose avant de croire au
 * produit. Elles ont donc leur place ici, juste avant le pied de page.
 *
 * Des accordéons plutôt qu'une liste dépliée : onze réponses posées les unes
 * sous les autres font un mur de texte que personne ne lit. Le couple
 * <details>/<summary> donne le pliage, le clavier et le lecteur d'écran sans
 * une ligne de JavaScript ni une dépendance de plus.
 */

const T: Record<Lang, {
  eyebrow: string;
  titre: string;
  faqs: { q: string; a: string }[];
}> = {
  fr: {
    eyebrow: "Ce qu'il faut savoir",
    titre: "Questions fréquentes",
    faqs: [
      {
        q: "Concrètement, il se passe quoi le jour J ?",
        a: "Vous avez imprimé le panneau d'accueil et les cartons de table, que nous vous livrons en fichiers prêts à imprimer avec votre formule ; ils portent votre QR code. Vos invités dirigent l'appareil photo de leur téléphone dessus, une page s'ouvre, ils envoient leurs photos. Aucune application, aucun compte. Vous, vous ne faites rien : vous regardez la galerie se remplir.",
      },
      {
        q: "Comment se fait le tri des photos ?",
        a: "Le tri est automatique : les doublons et les photos floues sont écartés de la sélection au fur et à mesure des dépôts, pour que la galerie reste regardable. Écartées ne veut pas dire supprimées — rien n'est jamais effacé. Vous pouvez afficher l'intégralité des photos déposées, y compris celles qui ont été mises de côté, et tout télécharger.",
      },
      {
        q: "Un invité peut-il retrouver uniquement ses photos ?",
        a: "Oui. Il se prend en selfie depuis la galerie, et l'outil lui montre les photos où il apparaît. Le selfie sert uniquement à cette comparaison et n'est jamais conservé. C'est facultatif, invité par invité, et disponible à partir de la formule Souvenir.",
      },
      {
        q: "Qui peut voir la galerie ?",
        a: "Elle est privée. On y accède par le QR code de votre événement ou par le lien que vous partagez, et par rien d'autre. Elle n'est pas référencée sur les moteurs de recherche : personne ne peut tomber dessus en cherchant votre nom.",
      },
      {
        q: "Combien de temps mes photos restent-elles en ligne ?",
        a: "Six mois à compter de votre événement, quelle que soit la formule — largement le temps de tout récupérer. Nous vous prévenons par email trente jours avant l'échéance, et le téléchargement de la galerie entière tient en un clic. Vous pouvez aussi la prolonger d'une année pour 29 €, autant de fois que vous le souhaitez. Sans prolongation, tout est supprimé définitivement à l'échéance, sauvegardes comprises : c'est ce que nous devons à vos invités, qui ne nous ont pas confié leurs photos pour que nous les gardions indéfiniment.",
      },
      {
        q: "Y a-t-il une limite au nombre de photos ?",
        a: "Non. Ni au nombre de photos, ni au nombre de vidéos, ni au nombre d'invités. Un mariage de deux cents personnes dépose souvent mille cinq cents photos : c'est compris.",
      },
      {
        q: "Et pour les invités qui repartent avant la fin, ou qui pensent aux photos le lendemain ?",
        a: "Le QR code reste actif après l'événement : les photos continuent d'arriver les jours suivants, et c'est souvent là que la galerie double de taille. Pour ceux qui partent tôt, une carte au même QR code se glisse dans le cadeau d'invité, et ils déposent leurs photos tranquillement en rentrant.",
      },
      {
        q: "Que se passe-t-il si je change d'avis après l'événement ?",
        a: "Vous pouvez passer à une formule supérieure tant que la galerie est en ligne, et vous ne payez que la différence. Les albums et objets imprimés se commandent quand vous voulez, séparément.",
      },
      {
        q: "Y a-t-il des frais cachés ?",
        a: "Non. Le prix affiché est le prix que vous payez, tout compris. Les seuls coûts en plus sont les objets imprimés, si vous en commandez.",
      },
      {
        q: "Mes invités doivent-ils créer un compte ?",
        a: "Non. Ils scannent le QR code avec leur téléphone et déposent leurs photos, sans installer d'application et sans créer de compte. La recherche par visage leur demande un selfie, mais c'est facultatif : ceux qui ne le font pas déposent leurs photos comme les autres.",
      },
      {
        q: "Le paiement est-il sécurisé ?",
        a: "Oui. Les paiements passent par Stripe, le prestataire qu'utilisent la plupart des sites que vous connaissez. Votre numéro de carte ne transite jamais par nos serveurs et nous ne le voyons jamais.",
      },
    ],
  },
  en: {
    eyebrow: "What you need to know",
    titre: "Frequently asked questions",
    faqs: [
      {
        q: "What actually happens on the day?",
        a: "You have printed the welcome sign and the table cards, which we hand you as print-ready files with your plan; they carry your QR code. Your guests point their phone camera at it, a page opens, they send their photos. No app, no account. You do nothing: you watch the gallery fill up.",
      },
      {
        q: "How are the photos sorted?",
        a: "Sorting is automatic: duplicates and blurred photos are set aside as the uploads come in, so the gallery stays worth looking at. Set aside does not mean deleted — nothing is ever erased. You can display every photo that was uploaded, including the ones put to one side, and download them all.",
      },
      {
        q: "Can a guest find only their own photos?",
        a: "Yes. They take a selfie from the gallery, and the tool shows them the photos they appear in. The selfie is used for that comparison only and is never kept. It is optional, guest by guest, and available from the Souvenir plan upwards.",
      },
      {
        q: "Who can see the gallery?",
        a: "It is private. You reach it through your event's QR code or through the link you share, and by nothing else. It is not indexed by search engines: nobody can stumble on it by looking up your name.",
      },
      {
        q: "How long do my photos stay online?",
        a: "Six months from your event, whatever the plan — ample time to save everything. We email you thirty days before the deadline, and downloading the whole gallery takes one click. You can extend it by a year for €29, as many times as you like. Without an extension, everything is permanently deleted at the deadline, backups included: that is what we owe your guests, who did not hand us their photos for us to keep forever.",
      },
      {
        q: "Is there a limit on the number of photos?",
        a: "No. No limit on photos, videos or guests. A two-hundred-guest wedding often uploads fifteen hundred photos: that is included.",
      },
      {
        q: "What about guests who leave early, or who only think of the photos the next day?",
        a: "The QR code stays live after the event: photos keep arriving over the following days, and that is often when the gallery doubles in size. For those who leave early, a card carrying the same QR code slips into the guest favour, and they upload their photos at their leisure once home.",
      },
      {
        q: "What if I change my mind after the event?",
        a: "You can move up a plan while the gallery is still online, and you only pay the difference. Printed albums and objects are ordered whenever you like, separately.",
      },
      {
        q: "Are there hidden fees?",
        a: "No. The price shown is the price you pay, all in. The only extra costs are printed objects, if you order any.",
      },
      {
        q: "Do my guests need an account?",
        a: "No. They scan the QR code with their phone and upload their photos, with no app and no account. Face search asks for a selfie, but it is optional: those who skip it upload like everyone else.",
      },
      {
        q: "Is payment secure?",
        a: "Yes. Payments go through Stripe, the provider behind most of the sites you already use. Your card number never passes through our servers and we never see it.",
      },
    ],
  },
};

const FaqAccueil = () => {
  const { lang } = useLanguage();
  const t = T[lang];

  return (
    <section
      id="faq"
      className="scroll-mt-[80px] border-t border-border bg-card py-[clamp(58px,7.5vw,100px)]"
    >
      <div className="mx-auto max-w-[820px] px-[clamp(20px,5vw,48px)]">
        <div className="mb-[clamp(28px,3.5vw,44px)] text-center">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 className="mt-3 text-[clamp(30px,4.2vw,48px)] text-wrap balance">{t.titre}</h2>
        </div>

        <div className="border-t border-border">
          {t.faqs.map((f) => (
            /* Le signe « + » bascule en croix quand la réponse s'ouvre : c'est
               le seul mouvement, et il suffit à dire que la ligne est cliquable. */
            <details key={f.q} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5 py-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                <h3 className="text-[clamp(17px,1.7vw,22px)] leading-snug text-foreground">{f.q}</h3>
                <span
                  aria-hidden
                  className="mt-1 shrink-0 select-none text-[22px] leading-none text-foreground transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="pb-7 pr-9 text-[15px] leading-relaxed text-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FaqAccueil;
