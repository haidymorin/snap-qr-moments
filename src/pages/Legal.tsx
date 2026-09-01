import Header from "@/components/Header";
import Footer from "@/components/Footer";

/* Mentions légales. Les crochets sont à remplir dès l'obtention du SIRET :
   sans identité complète et sans contact joignable, le site n'est pas
   conforme au code de la consommation, et Stripe le vérifie avant
   d'activer les paiements réels. */

const A_COMPLETER = "[à compléter]";

const BLOCS: { t: string; p: string[] }[] = [
  {
    t: "Éditeur du site",
    p: [
      "QR Memories — Haïdy Morin, entrepreneur individuel.",
      `Siège : ${A_COMPLETER}.`,
      `SIRET : ${A_COMPLETER}. Code APE : ${A_COMPLETER}.`,
      "TVA non applicable, article 293 B du code général des impôts.",
    ],
  },
  {
    t: "Directrice de la publication",
    p: ["Haïdy Morin."],
  },
  {
    t: "Nous joindre",
    p: [
      `Courriel : ${A_COMPLETER}.`,
      "C'est l'adresse à laquelle adresser toute question, réclamation, demande de retrait d'une photo ou exercice d'un droit sur vos données. Réponse sous 5 jours ouvrés.",
    ],
  },
  {
    t: "Hébergement",
    p: [
      "Le site et l'application sont hébergés par Lovable Labs Incorporated.",
      "Les données, les photos et les vidéos sont hébergées par Supabase, sur des serveurs situés dans l'Union européenne.",
    ],
  },
  {
    t: "Paiements",
    p: [
      "Les paiements sont traités par Stripe. Aucune donnée de carte bancaire ne transite par nos serveurs ni n'y est conservée.",
    ],
  },
  {
    t: "Propriété intellectuelle",
    p: [
      "La marque, les textes, la charte graphique et le code du site sont la propriété de l'éditeur. Les photographies et vidéos déposées sur une galerie restent la propriété de leurs auteurs et des personnes qui y figurent ; l'éditeur n'en acquiert aucun droit.",
      "Les photographies illustrant les pages publiques du site sont soit des photographies d'un événement réel, publiées avec l'accord des personnes concernées, soit des images libres de droits.",
    ],
  },
  {
    t: "Voir aussi",
    p: [
      "Les conditions générales de vente et la politique de confidentialité, accessibles depuis le pied de page, complètent les présentes mentions.",
    ],
  },
];

const Legal = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-[72px]">
        <section className="pb-[clamp(30px,4vw,52px)] pt-[clamp(48px,6vw,86px)]">
          <div className="mx-auto max-w-[760px] px-[clamp(20px,5vw,48px)]">
            <p className="eyebrow">Informations légales</p>
            <h1 className="mt-3 text-[clamp(34px,5.4vw,64px)] text-wrap balance">
              Mentions légales
            </h1>
          </div>
        </section>

        <section className="pb-[clamp(56px,7vw,96px)]">
          <div className="mx-auto max-w-[760px] px-[clamp(20px,5vw,48px)]">
            <div className="border-t border-border">
              {BLOCS.map((b) => (
                <article key={b.t} className="border-b border-border py-[clamp(24px,3vw,38px)]">
                  <h2 className="text-[clamp(19px,2vw,24px)] text-wrap balance">{b.t}</h2>
                  {b.p.map((par, i) => (
                    <p key={i} className="mt-3 text-[16px] leading-relaxed text-muted-foreground">
                      {par}
                    </p>
                  ))}
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Legal;
