import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { motsPour, type Support } from "@/data/motsAccueil";
import { lienInvite } from "@/lib/siteUrl";
import { envoyerSurR2, extensionDe } from "@/lib/r2";
import { compressImage } from "@/lib/imageCompression";
import CartonImprimable from "@/components/CartonImprimable";
import {
  COULEURS, MODELES, POLICES, jeuCouleurs, jeuPolices, modele as trouverModele,
} from "@/data/modelesCarton";
import { Loader2, Printer, ArrowLeft, Upload, X } from "lucide-react";

/* La signalétique à imprimer.
 *
 * Les cinq modèles ne sont pas calculés ici : leur mise en page a été posée à
 * la main, élément par élément, sur un canevas, puis figée dans
 * `src/data/modelesCarton.ts`. Cette page ne fait que trois choses — offrir
 * les réglages, rendre le carton à sa taille réelle, et le répéter sur une
 * planche A4.
 *
 * Pas de bibliothèque PDF : la page se met en forme pour l'impression et
 * c'est le navigateur qui produit le PDF. Le texte reste vectoriel, le QR
 * code est dessiné à quatre fois sa taille finale puis réduit, donc net.
 *
 * Deux garde-fous que le client ne peut pas contourner, et c'est voulu :
 *
 *   · le QR code est toujours noir sur blanc, quelle que soit la couleur
 *     choisie. Sur un fond sombre il reçoit une plaque blanche. Un code
 *     teinté ne se scanne pas, et un invité qui essaie trois fois devant la
 *     table repose son téléphone : on aurait payé une impression pour perdre
 *     des photos.
 *
 *   · la marge blanche autour du code est conservée. C'est elle qui permet au
 *     lecteur de trouver les bords.
 *
 * Le jeu « noir et blanc » n'est pas un dégradé des autres : c'est celui à
 * choisir quand on imprime sur une laser de bureau, où un fond crème sort
 * gris sale.
 */

interface Reglages {
  modele?: string;
  polices?: string;
  couleurs?: string;
  phrase?: string;
  photo?: string | null;
  sansMarque?: boolean;
  /* Le menu du repas, sur les modèles qui en portent un. */
  menuTitre?: string;
  service1?: string;
  plat1?: string;
  service2?: string;
  plat2?: string;
  service3?: string;
  plat3?: string;
}

interface Ev {
  id: string;
  name: string;
  event_date: string;
  user_id: string;
  plan: string;
  message_accueil: string | null;
  signaletique: Reglages | null;
}

const TEXTES: Record<Lang, Record<string, string>> = {
  fr: {
    titre: "Vos affiches à imprimer",
    chapo:
      "Choisissez un format, une typographie et une couleur, puis imprimez. Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF » si vous préférez l'envoyer à un imprimeur.",
    retour: "Revenir à l'événement",
    leFormat: "Le format",
    laTypo: "La typographie",
    laCouleur: "Les couleurs",
    laPhrase: "Votre phrase",
    phraseAide: "Écrivez la vôtre, ou choisissez-en une.",
    laPhoto: "Votre photo",
    photoAide:
      "Elle n'apparaît que sur les formats qui en prévoient une, et nulle part ailleurs : ni dans la galerie de vos invités, ni dans le diaporama.",
    ajouterPhoto: "Choisir une photo",
    retirerPhoto: "Retirer la photo",
    envoiPhoto: "Envoi…",
    marque: "Afficher qr-memories.fr en bas du carton",
    imprimer: "Imprimer",
    parPage: "par page A4",
    plie: "à plier en deux",
    aPlat: "à plat",
    enregistre: "Réglages enregistrés.",
    conseil: "Conseil d'impression",
    conseilTexte:
      "Papier de 250 g minimum pour les cartons pliés, sinon ils ne tiennent pas debout. Cochez « Graphiques d'arrière-plan » dans les options d'impression, sans quoi les aplats de couleur ne sortent pas. Et si vous imprimez en noir et blanc, choisissez le jeu de couleurs prévu pour ça.",
    qrProtege:
      "Le QR code reste noir sur blanc, quelle que soit la couleur choisie : c'est ce qui garantit qu'il se scanne du premier coup, sous n'importe quel éclairage.",
    introuvable: "Événement introuvable.",
    verrouTitre: "Modèles, typographies et couleurs : formule Souvenir",
    verrouTexte:
      "Votre formule Essentiel comprend les affiches et les cartons prêts à imprimer, avec le nom et la date de votre événement. Le choix du modèle, de la typographie, des couleurs, de la phrase et de la photo arrive avec la formule Souvenir.",
    verrouLien: "Voir ce que contient le Souvenir",
    legende: "SCANNEZ LE QR CODE",
    echec: "L'envoi a échoué.",
    leMenu: "Le menu du repas",
    menuAide:
      "Le carton reste sur la table pendant tout le dîner au lieu d'être poussé de côté : c'est ce qui fait scanner. Un champ laissé vide ne s'imprime pas.",
    menuTitre: "Menu",
    service1: "ENTRÉE",
    plat1: "Velouté de courge, noisettes torréfiées",
    service2: "PLAT",
    plat2: "Filet de bœuf, jus corsé, gratin dauphinois",
    service3: "DESSERT",
    plat3: "Pièce montée & fruits rouges",
  },
  en: {
    titre: "Your signs to print",
    chapo:
      "Pick a format, a typeface and a colour, then print. In the print dialog, choose “Save as PDF” if you would rather send it to a print shop.",
    retour: "Back to the event",
    leFormat: "The format",
    laTypo: "The typeface",
    laCouleur: "The colours",
    laPhrase: "Your line",
    phraseAide: "Write your own, or pick one.",
    laPhoto: "Your photo",
    photoAide:
      "It only appears on the formats that make room for one, and nowhere else: not in your guests' gallery, not in the slideshow.",
    ajouterPhoto: "Choose a photo",
    retirerPhoto: "Remove the photo",
    envoiPhoto: "Uploading…",
    marque: "Show qr-memories.fr at the bottom of the card",
    imprimer: "Print",
    parPage: "per A4 sheet",
    plie: "folded in two",
    aPlat: "flat",
    enregistre: "Settings saved.",
    conseil: "Printing tip",
    conseilTexte:
      "250 gsm paper at least for folded cards, otherwise they will not stand up. Tick “Background graphics” in the print options, or the colour areas will not print. And if you print in black and white, pick the colour set made for it.",
    qrProtege:
      "The QR code stays black on white whatever colour you choose: that is what makes it scan first time, under any lighting.",
    introuvable: "Event not found.",
    verrouTitre: "Templates, typefaces and colours: Souvenir plan",
    verrouTexte:
      "Your Essential plan includes the signs and cards ready to print, with your event name and date. Choosing the template, the typeface, the colours, the line and the photo comes with the Souvenir plan.",
    verrouLien: "See what Souvenir includes",
    legende: "SCAN THE QR CODE",
    echec: "The upload failed.",
    leMenu: "The dinner menu",
    menuAide:
      "The card stays on the table all through dinner instead of being pushed aside: that is what makes people scan. A field left empty is not printed.",
    menuTitre: "Menu",
    service1: "STARTER",
    plat1: "Squash velouté, roasted hazelnuts",
    service2: "MAIN",
    plat2: "Beef fillet, rich jus, potato gratin",
    service3: "DESSERT",
    plat3: "Croquembouche & red berries",
  },
};

/** Le support, au sens de la bibliothèque de phrases. */
const supportDe = (idModele: string): Support =>
  idModele === "grand-chevalet" || idModele === "chevalet-moyen"
    ? "panneau"
    : idModele === "petit-carton"
      ? "carton"
      : "chevalet";

const Signaletique = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const { lang } = useLanguage();
  const T = TEXTES[lang === "en" ? "en" : "fr"];

  const [ev, setEv] = useState<Ev | null>(null);
  const [chargement, setChargement] = useState(true);
  const [envoi, setEnvoi] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [r, setR] = useState<Reglages>({
    modele: "chevalet", polices: "anton", couleurs: "ivoire",
    phrase: "", photo: null, sansMarque: false,
  });

  /* L'enregistrement est différé : on ne veut pas une écriture en base à
     chaque cran de curseur. */
  const minuteur = useRef<number | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    void (async () => {
      const { data } = await supabase
        .from("events")
        .select("id,name,event_date,user_id,plan,message_accueil,signaletique")
        .eq("id", id)
        .maybeSingle();
      /* `signaletique` n'existe pas encore dans les types régénérés par
         Lovable : le passage par `unknown` évite l'erreur en attendant. */
      const e = (data as unknown as Ev | null) ?? null;
      setEv(e);
      if (e?.signaletique && Object.keys(e.signaletique).length > 0) {
        setR((prec) => ({ ...prec, ...e.signaletique }));
      } else if (e?.message_accueil) {
        setR((prec) => ({ ...prec, phrase: e.message_accueil ?? "" }));
      }
      setChargement(false);
    })();
  }, [id, user]);

  const enregistrer = useCallback((valeurs: Reglages) => {
    if (!id) return;
    if (minuteur.current) window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => {
      void supabase.from("events").update({ signaletique: valeurs } as never).eq("id", id);
      setNote(T.enregistre);
    }, 900);
  }, [id, T.enregistre]);

  const changer = (patch: Reglages) => {
    const suivant = { ...r, ...patch };
    setR(suivant);
    enregistrer(suivant);
  };

  const importer = async (fichier: File | null | undefined) => {
    if (!fichier || !id) return;
    setEnvoi(true);
    setNote(null);
    try {
      const { full } = await compressImage(fichier);
      const ext = extensionDe(fichier.type || "image/jpeg");
      const url = await envoyerSurR2({
        eventId: id,
        chemin: id + "/signaletique/" + crypto.randomUUID() + "." + ext,
        fichier: full,
        contentType: "image/jpeg",
      });
      changer({ photo: url });
    } catch {
      setNote(T.echec);
    }
    setEnvoi(false);
  };

  if (loading || chargement) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ev) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-5 text-center">
        <p className="text-muted-foreground">{T.introuvable}</p>
      </div>
    );
  }

  /* La personnalisation est ce que la formule Souvenir vend depuis le premier
     jour. L'Essentiel garde des cartons complets — son nom, sa date, le QR
     code — mais dans le modèle sobre et les couleurs de la marque. */
  const libre = ev.plan !== "essentiel";

  const m = trouverModele(libre ? r.modele ?? "chevalet" : "chevalet");
  const couleurs = jeuCouleurs(libre ? r.couleurs ?? "ivoire" : "ivoire");
  const polices = jeuPolices(libre ? r.polices ?? "anton" : "anton");

  const url = lienInvite(ev.id);
  const date = new Date(ev.event_date + "T12:00:00")
    .toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR",
      { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/[/.]/g, " · ");

  const textes = {
    noms: ev.name.toUpperCase(),
    phrase: (libre ? r.phrase?.trim() : "")
      || (lang === "en" ? "Share the love" : "Partagez vos photos"),
    date,
    legende: T.legende,
    marque: "qr-memories.fr",
    /* Le menu : ce que les mariés ont saisi, sinon l'exemple, qui sert aussi
       de repère de longueur à l'écran. */
    menuTitre: libre ? r.menuTitre ?? T.menuTitre : T.menuTitre,
    service1: libre ? r.service1 ?? T.service1 : T.service1,
    plat1: libre ? r.plat1 ?? T.plat1 : T.plat1,
    service2: libre ? r.service2 ?? T.service2 : T.service2,
    plat2: libre ? r.plat2 ?? T.plat2 : T.plat2,
    service3: libre ? r.service3 ?? T.service3 : T.service3,
    plat3: libre ? r.plat3 ?? T.plat3 : T.plat3,
  };

  const aPhoto = m.elements.some((el) => el.genre === "photo");
  const aMenu = m.elements.some(
    (el) => el.genre === "texte"
      && (el.champ.startsWith("menu") || el.champ.startsWith("service")),
  );
  /* Les six lignes du menu, dans l'ordre où elles s'impriment. */
  type ChampMenu =
    | "menuTitre" | "service1" | "plat1" | "service2" | "plat2" | "service3" | "plat3";
  const lignesMenu: { champ: ChampMenu; exemple: string; max: number }[] = [
    { champ: "menuTitre", exemple: T.menuTitre, max: 20 },
    { champ: "service1", exemple: T.service1, max: 24 },
    { champ: "plat1", exemple: T.plat1, max: 80 },
    { champ: "service2", exemple: T.service2, max: 24 },
    { champ: "plat2", exemple: T.plat2, max: 80 },
    { champ: "service3", exemple: T.service3, max: 24 },
    { champ: "plat3", exemple: T.plat3, max: 80 },
  ];

  const bouton = (actif: boolean) =>
    "rounded-xl border px-3 py-2 text-[13.5px] transition-colors "
    + (actif
      ? "border-primary bg-secondary text-foreground"
      : "border-border hover:border-primary/60");

  return (
    <div className="min-h-screen bg-background">
      {/* Les polices des modèles. Google Fonts est le seul hôte de polices
          autorisé, et les familles servies sont sous licence ouverte. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Allison&family=Anonymous+Pro&family=Playfair+Display:wght@700&family=Cormorant+Garamond:wght@400;600&family=Parisienne&family=Bricolage+Grotesque:wght@700&family=Instrument+Sans&display=swap"
      />
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        .carton { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          .sans-impression { display: none !important; }
          body { background: #fff !important; }
          .planche { gap: 0 !important; }
          .carton { outline: 0.2mm dashed rgba(0,0,0,.28); outline-offset: 0; }
        }
      `}</style>

      <div className="sans-impression border-b border-border bg-card">
        <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)] py-6">
          <Link to={"/dashboard/event/" + ev.id} className="label-mono inline-flex items-center gap-2 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {T.retour}
          </Link>
          <h1 className="mt-4 text-[clamp(26px,3.5vw,40px)]">{T.titre}</h1>
          <p className="mt-3 max-w-[62ch] text-[14.5px] leading-relaxed text-muted-foreground">{T.chapo}</p>

          {!libre && (
            <div className="mt-6 rounded-2xl border border-accent bg-card p-4">
              <p className="text-[14px] font-semibold text-foreground">{T.verrouTitre}</p>
              <p className="mt-1 max-w-[68ch] text-[13px] leading-relaxed text-muted-foreground">{T.verrouTexte}</p>
              <Link to="/tarifs#souvenir" className="label-mono mt-3 inline-block border-b border-foreground pb-1">
                {T.verrouLien}
              </Link>
            </div>
          )}

          <p className="label-mono mt-8">{T.leFormat}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {MODELES.map((x) => (
              <button
                key={x.id}
                type="button"
                disabled={!libre && x.id !== "chevalet"}
                onClick={() => changer({ modele: x.id })}
                className={bouton(m.id === x.id) + " disabled:opacity-40"}
              >
                {lang === "en" ? x.nomEn : x.nom}
                <span className="ml-2 text-muted-foreground">{x.mm.l} × {x.mm.h} mm</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">
            {m.parPage} {T.parPage} · {m.plie ? T.plie : T.aPlat}
          </p>

          {libre && (
            <>
              <p className="label-mono mt-8">{T.laTypo}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {POLICES.map((p) => (
                  <button key={p.id} type="button" onClick={() => changer({ polices: p.id })}
                    className={bouton(polices.id === p.id)}
                    style={{ fontFamily: '"' + p.titre + '", sans-serif' }}>
                    {p.nom}
                  </button>
                ))}
              </div>

              <p className="label-mono mt-8">{T.laCouleur}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {COULEURS.map((c) => (
                  <button key={c.id} type="button" onClick={() => changer({ couleurs: c.id })}
                    className={bouton(couleurs.id === c.id) + " inline-flex items-center gap-2"}>
                    <span aria-hidden className="block size-4 rounded-full border border-border"
                      style={{ background: c.fond }} />
                    {c.nom}
                  </button>
                ))}
              </div>

              <p className="label-mono mt-8">{T.laPhrase}</p>
              <p className="mt-1 text-[13px] text-muted-foreground">{T.phraseAide}</p>
              <input
                value={r.phrase ?? ""}
                maxLength={60}
                placeholder={textes.phrase}
                onChange={(e) => changer({ phrase: e.target.value })}
                className="mt-3 min-h-[42px] w-full max-w-[40ch] rounded-xl border border-border bg-background px-3 text-[14px] outline-none focus:border-primary"
              />
              {motsPour(lang, supportDe(m.id)).map((groupe) => (
                <div key={groupe.titre} className="mt-3">
                  <p className="label-mono">{groupe.titre}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {groupe.mots.map((x) => (
                      <button key={x.texte} type="button" onClick={() => changer({ phrase: x.texte })}
                        aria-pressed={r.phrase === x.texte}
                        className={"rounded-full border px-3 py-1.5 text-[13px] transition-colors "
                          + (r.phrase === x.texte
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary/60")}>
                        {x.texte}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {aMenu && (
                <>
                  <p className="label-mono mt-8">{T.leMenu}</p>
                  <p className="mt-1 max-w-[62ch] text-[13px] text-muted-foreground">{T.menuAide}</p>
                  <div className="mt-3 grid max-w-[46ch] gap-2">
                    {lignesMenu.map((ligne) => (
                      <input
                        key={ligne.champ}
                        value={r[ligne.champ] ?? ""}
                        maxLength={ligne.max}
                        placeholder={ligne.exemple}
                        onChange={(e) => changer({ [ligne.champ]: e.target.value } as Reglages)}
                        className="min-h-[42px] w-full rounded-xl border border-border bg-background px-3 text-[14px] outline-none focus:border-primary"
                      />
                    ))}
                  </div>
                </>
              )}

              {aPhoto && (
                <>
                  <p className="label-mono mt-8">{T.laPhoto}</p>
                  <p className="mt-1 max-w-[62ch] text-[13px] text-muted-foreground">{T.photoAide}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 text-[13.5px]">
                      {envoi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {envoi ? T.envoiPhoto : T.ajouterPhoto}
                      <input type="file" accept="image/*" hidden
                        onChange={(e) => void importer(e.target.files?.[0])} />
                    </label>
                    {r.photo && (
                      <button type="button" onClick={() => changer({ photo: null })}
                        className="inline-flex items-center gap-2 text-[13.5px] text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" /> {T.retirerPhoto}
                      </button>
                    )}
                  </div>
                </>
              )}

              <label className="mt-8 flex items-start gap-3 text-[13.5px]">
                <input type="checkbox" checked={!r.sansMarque}
                  onChange={(e) => changer({ sansMarque: !e.target.checked })} className="mt-1" />
                <span>{T.marque}</span>
              </label>
            </>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button type="button" onClick={() => window.print()}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-primary bg-primary px-6 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary">
              <Printer className="h-4 w-4" /> {T.imprimer}
            </button>
            {note && <span className="text-[13px] text-muted-foreground">{note}</span>}
          </div>

          <div className="mt-6 grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-2">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">{T.qrProtege}</p>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              <b className="text-foreground">{T.conseil} — </b>{T.conseilTexte}
            </p>
          </div>
        </div>
      </div>

      {/* La planche, telle qu'elle sortira de l'imprimante */}
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)] py-10">
        <div className="planche mx-auto flex flex-wrap justify-center gap-3" style={{ maxWidth: "194mm" }}>
          {Array.from({ length: m.parPage }, (_, i) => (
            <CartonImprimable
              key={i}
              modele={m}
              couleurs={couleurs}
              polices={polices}
              textes={textes}
              url={url}
              photo={libre ? r.photo ?? null : null}
              sansMarque={libre ? r.sansMarque : false}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Signaletique;
