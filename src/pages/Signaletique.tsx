import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { assombrir, contraste, encreSur, hexValide } from "@/lib/contraste";
import { Loader2, Printer, ArrowLeft } from "lucide-react";

/* La signalétique à imprimer.
 *
 * Elle était promise sur trois pages du site et n'existait nulle part. La
 * voici : un panneau d'accueil, des chevalets de table, et des petits cartons
 * à glisser dans les menus.
 *
 * Pas de bibliothèque PDF. La page se met en forme pour l'impression et c'est
 * le navigateur qui produit le PDF — « Imprimer », puis « Enregistrer au
 * format PDF ». Le texte reste vectoriel, le QR est dessiné à 1200 px et
 * réduit à l'impression, donc net à n'importe quelle taille. Un générateur
 * PDF maison aurait pesé trois cents kilo-octets pour un résultat moins bon.
 *
 * Deux garde-fous que la personne ne peut pas contourner, et c'est voulu :
 *
 *   · le QR code est TOUJOURS noir sur un carré blanc, quelle que soit la
 *     couleur choisie. Un code teinté en pastel ne se scanne pas, et un invité
 *     qui essaie trois fois devant la table repose son téléphone — on aurait
 *     payé une impression pour perdre des photos.
 *
 *   · la zone blanche autour du code est conservée. C'est elle qui permet au
 *     lecteur de trouver les bords ; collée au bord d'un aplat coloré, la
 *     détection échoue une fois sur deux selon l'éclairage de la salle.
 *
 * Le reste — fond, titre, filet — prend la couleur de l'événement, avec une
 * alerte quand elle est trop claire pour être lue.
 */

type Format = "panneau" | "chevalet" | "carton";

const TEXTES: Record<Lang, Record<string, string>> = {
  fr: {
    titre: "Vos affiches à imprimer",
    chapo: "Choisissez le format et votre couleur, puis imprimez. Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF » si vous préférez l'envoyer à un imprimeur.",
    retour: "Revenir à l'événement",
    panneau: "Panneau d'accueil",
    panneauAide: "A4 ou A3, à poser sur un chevalet à l'entrée. Imprimez-en un.",
    chevalet: "Chevalets de table",
    chevaletAide: "Six par page A4, à découper et plier. Comptez-en un par table.",
    carton: "Petits cartons",
    cartonAide: "Dix par page A4, format carte de visite, à glisser dans les menus.",
    couleur: "Votre couleur",
    couleurAide: "Elle habille le fond, le titre et le filet. Jamais le QR code.",
    message: "Le mot d'accueil",
    imprimer: "Imprimer",
    conseil: "Conseil d'impression",
    conseilTexte: "Papier de 250 g minimum pour les chevalets, sinon ils ne tiennent pas debout. Cochez « Graphiques d'arrière-plan » dans les options d'impression, sans quoi les aplats de couleur ne sortent pas.",
    alerteTitre: "Cette couleur est trop claire pour du texte",
    alerteTexte: "Le titre serait difficile à lire à deux mètres. Nous l'écrivons dans une version assombrie de votre teinte ; le fond, lui, garde la couleur choisie.",
    qrProtege: "Le QR code reste noir sur blanc : c'est ce qui garantit qu'il se scanne du premier coup, sous n'importe quel éclairage.",
    defautMessage: "Partagez vos photos de la soirée",
    sousTitre: "Photographiez ce code avec votre téléphone",
    mentionApp: "Aucune application à installer",
    introuvable: "Événement introuvable.",
  },
  en: {
    titre: "Your signs to print",
    chapo: "Pick the format and your colour, then print. In the print dialog, choose “Save as PDF” if you would rather send it to a print shop.",
    retour: "Back to the event",
    panneau: "Welcome sign",
    panneauAide: "A4 or A3, on an easel at the entrance. Print one.",
    chevalet: "Table cards",
    chevaletAide: "Six per A4 page, to cut and fold. One per table.",
    carton: "Small cards",
    cartonAide: "Ten per A4 page, business-card size, to slip into menus.",
    couleur: "Your colour",
    couleurAide: "It dresses the background, the title and the rule. Never the QR code.",
    message: "The welcome line",
    imprimer: "Print",
    conseil: "Printing tips",
    conseilTexte: "At least 250 gsm for the table cards, or they will not stand up. Tick “Background graphics” in the print options, otherwise the colour areas will not come out.",
    alerteTitre: "This colour is too light for text",
    alerteTexte: "The title would be hard to read from two metres. We print it in a darkened version of your shade; the background keeps the colour you chose.",
    qrProtege: "The QR code stays black on white: that is what makes it scan first time, under any lighting.",
    defautMessage: "Share your photos of the night",
    sousTitre: "Point your phone camera at this code",
    mentionApp: "No app to install",
    introuvable: "Event not found.",
  },
};

interface Ev { id: string; name: string; event_date: string; user_id: string }

/* Une pièce imprimée : le carré blanc du QR, le titre, le mot d'accueil.
   Les tailles sont en millimètres pour que ce qui sort de l'imprimante
   corresponde à ce qui est annoncé. */
function Piece({
  ev, url, fond, encre, titre, message, sousTitre, mention,
  largeur, qr, echelle,
}: {
  ev: Ev; url: string; fond: string; encre: string; titre: string;
  message: string; sousTitre: string; mention: string;
  largeur: number; qr: number; echelle: number;
}) {
  const date = new Date(`${ev.event_date}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div
      className="piece flex flex-col items-center justify-center text-center"
      style={{
        width: `${largeur}mm`,
        background: fond,
        color: encre,
        padding: `${6 * echelle}mm ${5 * echelle}mm`,
        gap: `${3 * echelle}mm`,
      }}
    >
      <p style={{ fontSize: `${3.2 * echelle}mm`, letterSpacing: "0.14em", opacity: 0.75, textTransform: "uppercase", margin: 0 }}>
        {message}
      </p>
      <p style={{ fontSize: `${6 * echelle}mm`, lineHeight: 1.1, fontWeight: 700, margin: 0 }}>
        {ev.name}
      </p>
      <p style={{ fontSize: `${3 * echelle}mm`, opacity: 0.7, margin: 0 }}>{date}</p>

      {/* Le carré blanc n'est pas décoratif : c'est la zone de silence du
          code. Sans elle, la détection échoue selon l'éclairage. */}
      <div style={{ background: "#FFFFFF", padding: `${qr * 0.1}mm`, borderRadius: `${1.5 * echelle}mm`, lineHeight: 0 }}>
        <QRCodeCanvas
          value={url}
          size={1200}
          level="H"
          bgColor="#FFFFFF"
          fgColor="#111111"
          style={{ width: `${qr}mm`, height: `${qr}mm` }}
        />
      </div>

      <p style={{ fontSize: `${3.4 * echelle}mm`, lineHeight: 1.35, margin: 0, maxWidth: `${largeur * 0.8}mm` }}>
        {sousTitre}
      </p>
      <p style={{ fontSize: `${2.6 * echelle}mm`, opacity: 0.62, margin: 0 }}>{mention}</p>
      <span style={{ fontSize: `${2.2 * echelle}mm`, opacity: 0.4, marginTop: `${1 * echelle}mm` }}>
        QR Memories
      </span>
      <span aria-hidden style={{ display: "block", width: `${10 * echelle}mm`, height: "0.4mm", background: encre, opacity: 0.35 }} />
    </div>
  );
}

const Signaletique = () => {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const { lang } = useLanguage();
  const T = TEXTES[lang];

  const [ev, setEv] = useState<Ev | null>(null);
  const [chargement, setChargement] = useState(true);
  const [format, setFormat] = useState<Format>("chevalet");
  const [couleur, setCouleur] = useState("#3F203A");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data } = await supabase
        .from("events").select("id,name,event_date,user_id").eq("id", id).maybeSingle();
      setEv((data as Ev) ?? null);
      setChargement(false);
    })();
  }, [id, user]);

  const url = id ? `${window.location.origin}/event/${id}` : "";
  const teinte = hexValide(couleur) ? couleur : "#3F203A";

  /* Le fond garde la couleur choisie ; le texte passe à une version assombrie
     quand elle ne se lit pas. On prévient, on ne corrige pas en silence. */
  const encre = encreSur(teinte);
  const tropClair = useMemo(() => contraste(teinte, "#FFFFFF") < 2.2, [teinte]);
  const encreTexte = tropClair ? assombrir(teinte, 7, "#FFFFFF") : encre;

  if (loading || chargement) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!ev) {
    return <div className="p-10 text-center text-muted-foreground">{T.introuvable}</div>;
  }

  const mot = message.trim() || T.defautMessage;

  /* Trois dispositions, trois pages. Les nombres par planche sont calés sur
     une A4 avec 10 mm de marge : six chevalets de 90 mm, dix cartons de
     85 mm. Ce sont des formats de massicot courants, pas des inventions. */
  const dispositions: Record<Format, { largeur: number; qr: number; echelle: number; nombre: number; page: string }> = {
    panneau:  { largeur: 190, qr: 70, echelle: 2.2, nombre: 1,  page: "A4 portrait" },
    chevalet: { largeur: 90,  qr: 34, echelle: 1.05, nombre: 6, page: "A4 portrait" },
    carton:   { largeur: 85,  qr: 26, echelle: 0.85, nombre: 10, page: "A4 portrait" },
  };
  const d = dispositions[format];

  return (
    <div className="min-h-screen bg-background">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        .piece { break-inside: avoid; page-break-inside: avoid; }
        @media print {
          .sans-impression { display: none !important; }
          body { background: #fff !important; }
          .planche { gap: 0 !important; }
          .piece { border: 0.2mm dashed rgba(0,0,0,.25); }
        }
      `}</style>

      <div className="sans-impression border-b border-border bg-card">
        <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)] py-6">
          <Link to={`/dashboard/event/${ev.id}`} className="label-mono inline-flex items-center gap-2 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {T.retour}
          </Link>
          <h1 className="mt-4 text-[clamp(26px,3.5vw,40px)]">{T.titre}</h1>
          <p className="mt-3 max-w-[62ch] text-[14.5px] leading-relaxed text-muted-foreground">{T.chapo}</p>

          <div className="mt-7 grid gap-5 md:grid-cols-3">
            {(["panneau", "chevalet", "carton"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  format === f ? "border-primary bg-secondary" : "border-border hover:border-primary"
                }`}
              >
                <span className="block text-[15px] font-semibold text-foreground">{T[f]}</span>
                <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                  {T[`${f}Aide`]}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div>
              <label htmlFor="couleur" className="block text-[13.5px] font-semibold text-foreground">
                {T.couleur}
              </label>
              <p className="mt-1 max-w-[42ch] text-[12.5px] text-muted-foreground">{T.couleurAide}</p>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="couleur" type="color" value={teinte}
                  onChange={(e) => setCouleur(e.target.value)}
                  className="h-[42px] w-[56px] cursor-pointer rounded-xl border border-border bg-background p-1"
                />
                <input
                  value={couleur} onChange={(e) => setCouleur(e.target.value)}
                  className="min-h-[42px] w-[110px] rounded-xl border border-border bg-background px-3 font-mono text-[13px] outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="min-w-[240px] flex-1">
              <label htmlFor="mot" className="block text-[13.5px] font-semibold text-foreground">
                {T.message}
              </label>
              <input
                id="mot" value={message} placeholder={T.defautMessage} maxLength={60}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-2 min-h-[42px] w-full rounded-xl border border-border bg-background px-3 text-[14px] outline-none focus:border-primary"
              />
            </div>

            <button
              type="button" onClick={() => window.print()}
              className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-primary bg-primary px-6 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
            >
              <Printer className="h-4 w-4" /> {T.imprimer}
            </button>
          </div>

          {tropClair && (
            <div className="mt-6 rounded-2xl border border-accent bg-card p-4">
              <p className="text-[14px] font-semibold text-foreground">{T.alerteTitre}</p>
              <p className="mt-1 max-w-[64ch] text-[13px] leading-relaxed text-muted-foreground">
                {T.alerteTexte}
              </p>
            </div>
          )}

          <div className="mt-4 grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-2">
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">{T.qrProtege}</p>
            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              <b className="text-foreground">{T.conseil} — </b>{T.conseilTexte}
            </p>
          </div>
        </div>
      </div>

      {/* La planche, telle qu'elle sortira */}
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)] py-10">
        <div
          className="planche mx-auto flex flex-wrap justify-center gap-3"
          style={{ maxWidth: format === "panneau" ? "200mm" : "190mm" }}
        >
          {Array.from({ length: d.nombre }, (_, i) => (
            <Piece
              key={i} ev={ev} url={url}
              fond={teinte} encre={tropClair ? encreTexte : encre}
              titre={ev.name} message={mot}
              sousTitre={T.sousTitre} mention={T.mentionApp}
              largeur={d.largeur} qr={d.qr} echelle={d.echelle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Signaletique;
