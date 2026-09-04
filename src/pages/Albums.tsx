import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { OBJETS } from "@/data/objets";

/* Les albums et objets imprimés.
 *
 * Aucune photo de produit ici, et c'est volontaire : ces objets n'ont pas
 * encore été fabriqués. Montrer l'album d'un autre imprimeur en le faisant
 * passer pour le nôtre serait un mensonge que le premier client découvrirait
 * en ouvrant son colis. On décrit précisément, on ne met pas d'image.
 */

const TEXTES: Record<Lang, {
  eyebrow: string; titre: string; chapo: string;
  quandTitre: string; quand: { n: string; t: string; d: string }[];
  inclusTitre: string; inclus: string; inclusLien: string;
  bientot: string;
}> = {
  fr: {
    eyebrow: "Ce qu'il reste après",
    titre: "Un souvenir qui se touche.",
    chapo:
      "Une galerie en ligne ferme au bout de six mois. Un livre posé sur une table, non. Ces objets sont fabriqués à partir des photos déposées par vos invités et des mots qu'ils vous ont laissés.",
    quandTitre: "Comment ça se passe",
    quand: [
      {
        n: "01",
        t: "Après votre événement",
        d: "Les photos sont arrivées, les doublons et les photos floues ont été mis de côté. Vous regardez ce que vous avez.",
      },
      {
        n: "02",
        t: "Vous commandez ce que vous voulez",
        d: "Depuis votre tableau de bord, en un clic. Rien n'est à décider avant la fête, et rien ne vous est imposé.",
      },
      {
        n: "03",
        t: "Nous mettons en page, vous validez",
        d: "Nous vous envoyons la maquette complète. Vous demandez les changements que vous voulez. Rien ne part à l'impression sans votre accord.",
      },
      {
        n: "04",
        t: "Livraison chez vous",
        d: "Comptez deux à trois semaines après votre validation, selon l'objet.",
      },
    ],
    inclusTitre: "Déjà compris dans une formule",
    inclus:
      "L'album grand format et la gazette en cinquante exemplaires sont compris dans la formule Héritage. Pris séparément, ils coûtent 398 € ; la formule entière en coûte 390 et contient aussi tout le numérique.",
    inclusLien: "Voir les formules",
    bientot: "Photo à venir",
  },
  en: {
    eyebrow: "What is left afterwards",
    titre: "A memory you can hold.",
    chapo:
      "An online gallery closes after six months. A book on a table does not. These objects are made from the photos your guests uploaded and the words they left you.",
    quandTitre: "How it works",
    quand: [
      {
        n: "01",
        t: "After your event",
        d: "The photos have arrived, duplicates and blurry shots have been set aside. You look at what you have.",
      },
      {
        n: "02",
        t: "You order what you want",
        d: "From your dashboard, in one click. Nothing to decide before the party, and nothing is forced on you.",
      },
      {
        n: "03",
        t: "We lay it out, you approve",
        d: "We send you the full mock-up. You ask for any changes. Nothing goes to print without your approval.",
      },
      {
        n: "04",
        t: "Delivered to your door",
        d: "Allow two to three weeks after your approval, depending on the object.",
      },
    ],
    inclusTitre: "Already included in a plan",
    inclus:
      "The large album and the fifty-copy newspaper are included in the Heritage plan. Bought separately they cost €398; the whole plan costs €390 and also contains everything digital.",
    inclusLien: "See the plans",
    bientot: "Photo to come",
  },
};

const Albums = () => {
  const { lang } = useLanguage();
  const T = TEXTES[lang];
  const { objets, note } = OBJETS[lang];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-[72px]">
        <section className="pb-[clamp(28px,3.5vw,44px)] pt-[clamp(48px,6vw,84px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)] text-center">
            <p className="eyebrow">{T.eyebrow}</p>
            <h1 className="mx-auto mt-3 max-w-[16ch] text-[clamp(38px,6vw,72px)]">{T.titre}</h1>
            <p className="mx-auto mt-5 max-w-[58ch] leading-relaxed text-foreground">{T.chapo}</p>
          </div>
        </section>

        {/* Le catalogue */}
        <section className="pb-[clamp(46px,6vw,80px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            <div className="grid gap-[clamp(14px,1.8vw,22px)] md:grid-cols-2">
              {objets.map((o) => (
                <article
                  key={o.titre}
                  className="flex flex-col rounded-2xl border border-border bg-card p-[clamp(24px,2.6vw,34px)]"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-[clamp(21px,2vw,27px)] leading-tight">{o.titre}</h2>
                    <span className="shrink-0 font-display text-[clamp(22px,2.1vw,28px)] leading-none">
                      {o.prix}
                    </span>
                  </div>

                  {o.inclus && (
                    <span className="label-mono mt-3 self-start rounded-full border border-border px-2.5 py-1 text-foreground opacity-100">
                      {o.inclus}
                    </span>
                  )}

                  <p className="mt-4 text-[15px] leading-relaxed text-foreground">{o.quoi}</p>

                  <dl className="mt-5 space-y-3 border-t border-border pt-5 text-[14px] leading-relaxed">
                    <div>
                      <dt className="label-mono text-muted-foreground">
                        {lang === "fr" ? "Le format" : "The format"}
                      </dt>
                      <dd className="mt-1 text-foreground">{o.detail}</dd>
                    </div>
                    <div>
                      <dt className="label-mono text-muted-foreground">
                        {lang === "fr" ? "Ce qu'on en fait" : "What it's for"}
                      </dt>
                      <dd className="mt-1 text-foreground">{o.pourQui}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>

            <p className="mx-auto mt-[clamp(24px,3vw,38px)] max-w-[62ch] text-center text-[15px] leading-relaxed text-muted-foreground">
              {note}
            </p>
          </div>
        </section>

        {/* Le déroulé */}
        <section className="border-t border-border bg-card py-[clamp(58px,7.5vw,100px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            <h2 className="mb-[clamp(28px,3.5vw,44px)] text-center text-[clamp(30px,4.2vw,48px)]">
              {T.quandTitre}
            </h2>
            <div className="grid gap-[clamp(14px,1.8vw,22px)] sm:grid-cols-2 lg:grid-cols-4">
              {T.quand.map((e) => (
                <div key={e.n} className="rounded-2xl border border-border bg-background p-6">
                  <div className="label-mono text-foreground">{e.n}</div>
                  <h3 className="mb-2 mt-4 text-[clamp(18px,1.7vw,22px)] leading-snug">{e.t}</h3>
                  <p className="text-[14.5px] leading-relaxed text-muted-foreground">{e.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Renvoi vers l'Héritage */}
        <section className="py-[clamp(58px,7.5vw,100px)]">
          <div className="mx-auto max-w-[820px] px-[clamp(20px,5vw,48px)] text-center">
            <p className="eyebrow">{T.inclusTitre}</p>
            <p className="mx-auto mt-4 max-w-[58ch] leading-relaxed text-foreground">{T.inclus}</p>
            <Link
              to="/pricing"
              className="mt-7 inline-flex min-h-[48px] items-center rounded-full border border-primary bg-primary px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
            >
              {T.inclusLien}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Albums;
