import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { photo, photoUrl, MARIAGE_REEL } from "@/lib/photos";
import { X } from "lucide-react";

/* La galerie de démonstration.
 *
 * Le plus gros frein du site était celui-ci : personne ne pouvait REGARDER le
 * produit avant de payer. On vendait une interface en montrant des photos de
 * mariage et des paragraphes — l'équivalent d'un concessionnaire qui refuse
 * qu'on ouvre la portière.
 *
 * Aucune donnée réelle, aucun événement en base : tout est dessiné ici, avec
 * les photos libres de droits du site. C'est un choix, pas un raccourci — un
 * vrai événement de démonstration serait un vrai événement, avec une adresse
 * de dépôt, et le jour où quelqu'un y envoie les photos de son mariage on a
 * un problème qu'on ne peut plus réparer.
 *
 * D'où deux règles tenues partout sur cette page : elle dit qu'elle est une
 * démonstration, et rien n'y est cliquable qui laisserait croire qu'on peut y
 * déposer quelque chose.
 */

type Onglet = "toutes" | "moi" | "jeu" | "livre";

const T: Record<Lang, {
  banniere: string; banniereLien: string;
  titre: string; date: string; lieu: string;
  onglets: Record<Onglet, string>;
  moiTitre: string; moiTexte: string;
  jeuTitre: string; jeuTexte: string; jeuFait: string; jeuScore: string;
  livreTitre: string;
  cta: string; ctaTexte: string; ctaBouton: string; ctaSecond: string;
  fermer: string;
  defis: string[];
  messages: { auteur: string; texte: string; heure: string }[];
}> = {
  fr: {
    banniere: "Démonstration — ce mariage n'existe pas, les photos sont libres de droits et le dépôt est désactivé.",
    banniereLien: "Voir les formules",
    titre: "Camille & Sacha",
    date: "Samedi 14 juin 2026",
    lieu: "827 photos · 41 vidéos · 63 messages",
    onglets: {
      toutes: "Toutes les photos",
      moi: "Photos de moi",
      jeu: "Le jeu",
      livre: "Le livre d'or",
    },
    moiTitre: "Ce que voit un invité qui s'est reconnu",
    moiTexte:
      "Il prend un selfie, et il ne lui reste que les photos où il apparaît — huit sur huit cent vingt-sept. C'est facultatif : celui qui ne le fait pas dépose ses photos comme les autres.",
    jeuTitre: "La chasse au trésor",
    jeuTexte: "Douze défis. On photographie, le défi se coche.",
    jeuFait: "Fait",
    jeuScore: "Vos défis relevés",
    livreTitre: "Ce que les invités ont écrit",
    cta: "Votre galerie, dans deux minutes",
    ctaTexte:
      "Celle-ci est une mise en scène. La vôtre se remplit toute seule pendant la soirée, avec les photos de vos invités.",
    ctaBouton: "Créer mon événement",
    ctaSecond: "Voir les formules",
    fermer: "Fermer",
    defis: [
      "Les mariés qui ne regardent pas l'objectif",
      "Une photo avec quelqu'un que vous ne connaissiez pas ce matin",
      "La table la plus bruyante",
      "Les chaussures de la mariée",
      "Quelqu'un qui rit tellement qu'il ne peut plus parler",
      "Trois générations sur la même photo",
      "Le dessert avant que quelqu'un y touche",
      "Une photo prise depuis la piste de danse",
      "La personne la plus élégante de la soirée",
      "Un détail que personne ne remarquera",
      "Les témoins, réunis",
      "Le moment juste après les applaudissements",
    ],
    messages: [
      { auteur: "Jeanne, sa grand-mère", heure: "22 h 14 · Table 3",
        texte: "Ma chérie, je n'ai pas trouvé les mots hier soir. Alors je te les écris ici, pendant que tu danses." },
      { auteur: "Karim", heure: "23 h 02 · Table 7",
        texte: "Trente ans qu'on se connaît et je ne t'avais jamais vu pleurer. Merci pour ça." },
      { auteur: "Les cousins de Lyon", heure: "01 h 47 · Table 11",
        texte: "On a fini les petits fours, on assume. Bravo à vous deux, c'était magnifique." },
      { auteur: "Sofia", heure: "20 h 38 · Table 2",
        texte: "Je garde l'image de vous deux à la sortie de la mairie. Tout le monde criait et vous ne regardiez que l'autre." },
    ],
  },
  en: {
    banniere: "Demonstration — this wedding does not exist, the photos are royalty-free and uploading is disabled.",
    banniereLien: "See the plans",
    titre: "Camille & Sacha",
    date: "Saturday 14 June 2026",
    lieu: "827 photos · 41 videos · 63 messages",
    onglets: {
      toutes: "All the photos",
      moi: "Photos of me",
      jeu: "The game",
      livre: "The guest book",
    },
    moiTitre: "What a guest who recognised themselves sees",
    moiTexte:
      "They take a selfie, and only the photos they appear in are left — eight out of eight hundred and twenty-seven. It is optional: whoever skips it uploads like everyone else.",
    jeuTitre: "The treasure hunt",
    jeuTexte: "Twelve challenges. Take the photo, the challenge is ticked off.",
    jeuFait: "Done",
    jeuScore: "Challenges you have taken on",
    livreTitre: "What the guests wrote",
    cta: "Your gallery, in two minutes",
    ctaTexte:
      "This one is staged. Yours fills up on its own during the night, with your guests' photos.",
    ctaBouton: "Create my event",
    ctaSecond: "See the plans",
    fermer: "Close",
    defis: [
      "The couple not looking at the camera",
      "A photo with someone you did not know this morning",
      "The loudest table",
      "The bride's shoes",
      "Someone laughing too hard to speak",
      "Three generations in one photo",
      "The dessert before anyone touches it",
      "A photo taken from the dance floor",
      "The best-dressed person of the night",
      "A detail nobody else will notice",
      "The witnesses, together",
      "The moment right after the applause",
    ],
    messages: [
      { auteur: "Jeanne, her grandmother", heure: "10:14 pm · Table 3",
        texte: "My darling, I could not find the words last night. So I am writing them here, while you dance." },
      { auteur: "Karim", heure: "11:02 pm · Table 7",
        texte: "Thirty years and I had never seen you cry. Thank you for that." },
      { auteur: "The cousins from Lyon", heure: "1:47 am · Table 11",
        texte: "We finished the canapés, we own it. Well done both of you, it was beautiful." },
      { auteur: "Sofia", heure: "8:38 pm · Table 2",
        texte: "I keep the picture of you two leaving the town hall. Everyone was shouting and you only looked at each other." },
    ],
  },
};

/* Huit photos où la mariée apparaît, reprises de la démonstration de
   l'accueil : c'est la même personne, sans quoi la reconnaissance par visage
   ne veut rien dire. */
const CAMILLE = [13434416, 13434413, 13434423, 13434424, 13434430, 13434433, 13434437, 13434429];
const DEFIS_FAITS = [0, 2, 3, 6, 9];

const Demo = () => {
  const { lang } = useLanguage();
  const t = T[lang];
  const [onglet, setOnglet] = useState<Onglet>("toutes");
  const [agrandie, setAgrandie] = useState<string | null>(null);

  /* Les photos du mariage de juin ouvrent la galerie, le reste vient de la
     banque d'images. */
  const toutes = useMemo(() => {
    const libres = Array.from({ length: 44 }, (_, i) => photo(i * 3 + 2, 640));
    const reelles = MARIAGE_REEL.map((p) => p.src);
    return [reelles[0], ...libres.slice(0, 5), reelles[1], ...libres.slice(5, 11),
            reelles[2], ...libres.slice(11, 19), reelles[3], ...libres.slice(19)];
  }, []);

  const mesPhotos = useMemo(() => CAMILLE.map((id) => photoUrl(id, 640)), []);
  const affichees = onglet === "moi" ? mesPhotos : toutes;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 pt-[72px]">
        {/* La bannière ne disparaît jamais : une démonstration qu'on prend
            pour un vrai mariage se retourne contre nous. */}
        <div className="border-b border-accent bg-card">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-[clamp(20px,5vw,48px)] py-3">
            <p className="text-[13.5px] leading-relaxed text-foreground">{t.banniere}</p>
            <Link to="/pricing" className="label-mono shrink-0 border-b border-foreground pb-0.5 text-foreground opacity-100">
              {t.banniereLien}
            </Link>
          </div>
        </div>

        <section className="pb-[clamp(24px,3vw,36px)] pt-[clamp(36px,5vw,64px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)] text-center">
            <h1 className="text-[clamp(34px,5.5vw,62px)]">{t.titre}</h1>
            <p className="label-mono mt-3">{t.date}</p>
            <p className="mt-2 text-[14.5px] text-muted-foreground">{t.lieu}</p>
          </div>
        </section>

        <section className="pb-[clamp(58px,7.5vw,100px)]">
          <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
            <div className="flex flex-wrap gap-2" role="tablist">
              {(["toutes", "moi", "jeu", "livre"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  role="tab"
                  aria-selected={onglet === o}
                  onClick={() => setOnglet(o)}
                  className={`inline-flex min-h-[42px] items-center rounded-full border px-4 text-[13.5px] transition-colors ${
                    onglet === o
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:border-primary"
                  }`}
                >
                  {t.onglets[o]}
                </button>
              ))}
            </div>

            {onglet === "moi" && (
              <div className="mt-6 rounded-2xl border border-border bg-card p-5">
                <p className="text-[15px] font-semibold text-foreground">{t.moiTitre}</p>
                <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-muted-foreground">
                  {t.moiTexte}
                </p>
              </div>
            )}

            {(onglet === "toutes" || onglet === "moi") && (
              <div className="mt-6 grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
                {affichees.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setAgrandie(src)}
                    style={{ aspectRatio: "1 / 1" }}
                    className="group relative w-full overflow-hidden rounded-lg bg-secondary"
                  >
                    <img
                      src={src}
                      alt=""
                      loading={i < 8 ? "eager" : "lazy"}
                      decoding="async"
                      style={{ objectPosition: "50% 34%" }}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                    />
                  </button>
                ))}
              </div>
            )}

            {onglet === "jeu" && (
              <div className="mt-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl">{t.jeuTitre}</h2>
                    <p className="mt-2 text-[14.5px] text-muted-foreground">{t.jeuTexte}</p>
                  </div>
                  <div className="text-right">
                    <span className="label-mono block">{t.jeuScore}</span>
                    <span className="font-display text-[34px] leading-none">
                      {DEFIS_FAITS.length}<span className="text-muted-foreground">/12</span>
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {t.defis.map((d, i) => {
                    const fait = DEFIS_FAITS.includes(i);
                    return (
                      <div
                        key={d}
                        className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 ${
                          fait ? "border-primary bg-secondary" : "border-border bg-card"
                        }`}
                      >
                        <span className="text-[14px] leading-snug text-foreground">{d}</span>
                        <span className={`label-mono opacity-100 ${fait ? "text-primary" : "text-muted-foreground"}`}>
                          {fait ? `✓ ${t.jeuFait}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {onglet === "livre" && (
              <div className="mt-6">
                <h2 className="text-2xl">{t.livreTitre}</h2>
                <div className="mt-6 grid gap-[clamp(13px,1.7vw,20px)] md:grid-cols-2">
                  {t.messages.map((m) => (
                    <figure key={m.auteur} className="m-0 rounded-2xl border border-border bg-card p-6">
                      <blockquote className="m-0 font-display text-[clamp(19px,2.1vw,25px)] italic leading-[1.35]">
                        {m.texte}
                      </blockquote>
                      <figcaption className="mt-5 border-t border-border pt-4">
                        <b className="block text-[14.5px] font-semibold text-foreground">{m.auteur}</b>
                        <span className="label-mono">{m.heure}</span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-border py-[clamp(58px,7.5vw,100px)]">
          <div className="mx-auto max-w-[820px] px-[clamp(20px,5vw,48px)] text-center">
            <h2 className="text-[clamp(28px,4.2vw,48px)]">{t.cta}</h2>
            <p className="mx-auto mt-4 max-w-[52ch] leading-relaxed text-muted-foreground">{t.ctaTexte}</p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/creer"
                className="inline-flex min-h-[48px] items-center rounded-full border border-primary bg-primary px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
              >
                {t.ctaBouton}
              </Link>
              <Link
                to="/pricing"
                className="inline-flex min-h-[48px] items-center rounded-full border border-border px-7 py-4 text-xs font-semibold uppercase tracking-[0.1em] text-foreground transition-colors hover:border-primary"
              >
                {t.ctaSecond}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {agrandie && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setAgrandie(null)}
          role="dialog"
        >
          <img src={agrandie} alt="" className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain" />
          <button
            type="button"
            aria-label={t.fermer}
            className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/40 text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Demo;
