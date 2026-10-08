import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingBag } from "lucide-react";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { startCommande, type PlanId, type ProduitCommande } from "@/lib/checkout";
import { FORMULES } from "@/data/formules";

/* Commander après l'achat, depuis l'espace des mariés.
 *
 * Tout ce que la page Albums et la FAQ présentent se commande ici : l'album
 * grand format, les mini-albums, une année de plus en ligne, et le passage à
 * une formule supérieure en ne payant que la différence. Le paiement passe
 * par Stripe, et c'est le webhook qui applique la commande : album débloqué,
 * échéance repoussée, formule changée.
 *
 * Les prix affichés ici ne décident de rien : le serveur recalcule chaque
 * montant. Ils doivent seulement rester identiques à ceux de
 * `create-checkout-session`.
 */

const PRIX = { album: 129, mini_album: 45, annee: 29 };
const ORDRE: PlanId[] = ["essentiel", "souvenir", "heritage"];

const T: Record<Lang, Record<string, string>> = {
  fr: {
    titre: "Commander",
    chapo: "Les objets imprimés, une année de plus en ligne, ou une formule au-dessus. Le paiement se fait en ligne, en quelques secondes.",
    album: "L'album photo grand format",
    albumAide: "28 × 28 cm, 80 pages, couverture rigide. Ouvre l'outil de composition de l'album.",
    mini: "Le mini-album",
    miniAide: "20 × 20 cm, couverture souple, 40 pages. À offrir aux parents, aux témoins.",
    annee: "Une année de plus en ligne",
    anneeAide: "Votre galerie ferme le",
    anneeAide2: "Elle restera ouverte un an de plus.",
    montee: "Passer à la formule",
    monteeAide: "Vous ne payez que la différence. Tout ce qui est déjà en ligne reste en place.",
    quantite: "Quantité",
    commander: "Commander",
    vosCommandes: "Vos commandes",
    merci: "Paiement reçu, merci. Votre commande apparaît ci-dessous dans un instant.",
    annule: "Le paiement a été annulé. Rien n'a été débité.",
    payee: "Payée",
    en_fabrication: "En fabrication",
    expediee: "Expédiée",
    livree: "Livrée",
    annulee: "Annulée",
  },
  en: {
    titre: "Order",
    chapo: "Printed objects, one more year online, or a higher plan. Payment is online and takes a few seconds.",
    album: "The large-format photo album",
    albumAide: "28 × 28 cm, 80 pages, hard cover. Opens the album builder.",
    mini: "The mini album",
    miniAide: "20 × 20 cm, soft cover, 40 pages. A gift for parents and witnesses.",
    annee: "One more year online",
    anneeAide: "Your gallery closes on",
    anneeAide2: "It will stay open one more year.",
    montee: "Move up to",
    monteeAide: "You only pay the difference. Everything already online stays in place.",
    quantite: "Quantity",
    commander: "Order",
    vosCommandes: "Your orders",
    merci: "Payment received, thank you. Your order will appear below in a moment.",
    annule: "The payment was cancelled. Nothing was charged.",
    payee: "Paid",
    en_fabrication: "Being made",
    expediee: "Shipped",
    livree: "Delivered",
    annulee: "Cancelled",
  },
};

const NOMS: Record<Lang, Record<string, string>> = {
  fr: { album: "Album grand format", mini_album: "Mini-album", annee: "Année en ligne", montee: "Passage de formule" },
  en: { album: "Large album", mini_album: "Mini album", annee: "Year online", montee: "Plan upgrade" },
};

interface Commande {
  id: string;
  produit: string;
  quantite: number;
  montant_centimes: number;
  plan_cible: string | null;
  statut: string;
  cree_le: string;
}

interface Props {
  eventId: string;
  plan: string;
  expireLe: string | null;
  albumInclus: boolean;
  /** Relit l'événement : une montée de formule ou un album débloqué change la page. */
  onActualiser?: () => void;
}

const CarteCommandes = ({ eventId, plan, expireLe, albumInclus, onActualiser }: Props) => {
  const { lang } = useLanguage();
  const l: Lang = lang === "en" ? "en" : "fr";
  const t = T[l];
  const racine = useRef<HTMLElement>(null);

  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [quantiteMini, setQuantiteMini] = useState(1);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [retour, setRetour] = useState<"ok" | "annulee" | null>(null);

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from("commandes")
      .select("id, produit, quantite, montant_centimes, plan_cible, statut, cree_le")
      .eq("event_id", eventId)
      .order("cree_le", { ascending: false });
    setCommandes((data as unknown as Commande[] | null) ?? []);
  }, [eventId]);

  useEffect(() => { void charger(); }, [charger]);

  /* Retour de Stripe (?commande=ok) ou lien du rappel d'échéance
     (?prolonger=1) : on amène la personne ici, et on relit les commandes
     quelques secondes plus tard, le temps que le webhook passe. */
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("commande");
    if (c === "ok" || c === "annulee") setRetour(c);
    if (c || p.get("prolonger")) {
      setTimeout(() => racine.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 400);
    }
    if (c === "ok") {
      const minuterie = setTimeout(() => { void charger(); onActualiser?.(); }, 4000);
      return () => clearTimeout(minuterie);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charger]);

  const commander = async (produit: ProduitCommande, extra: { quantite?: number; planCible?: PlanId } = {}) => {
    setErreur(null);
    setOccupe(produit + (extra.planCible ?? ""));
    try {
      await startCommande({ eventId, produit, ...extra });
    } catch (e) {
      setErreur((e as Error).message);
      setOccupe(null);
    }
  };

  const formules = FORMULES[l];
  const prixPlan = (id: string) => formules.find((f) => f.id === id)?.prixCentimes ?? 0;
  const rang = ORDRE.indexOf(plan as PlanId);
  const superieures = rang >= 0 ? ORDRE.slice(rang + 1) : [];
  const dateFermeture = expireLe
    ? new Date(`${expireLe}T12:00:00`).toLocaleDateString(l === "en" ? "en-GB" : "fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  const Ligne = ({ titre, aide, prix, action }: {
    titre: string; aide: string; prix: string; action: React.ReactNode;
  }) => (
    <li className="flex flex-wrap items-center justify-between gap-4 border-t border-border py-4 first:border-t-0">
      <div className="min-w-[220px] flex-1">
        <p className="text-[15.5px] font-semibold text-foreground">{titre}</p>
        <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted-foreground">{aide}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-[15px] tabular-nums text-foreground">{prix}</span>
        {action}
      </div>
    </li>
  );

  const bouton = (cle: string, onClick: () => void) => (
    <Button type="button" size="sm" disabled={occupe !== null} onClick={onClick}>
      {occupe === cle && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {t.commander}
    </Button>
  );

  return (
    <section ref={racine} id="commander" className="mt-8 scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h2 className="text-[17px] font-semibold text-foreground">{t.titre}</h2>
          <p className="mt-1 max-w-[64ch] text-[14px] leading-relaxed text-muted-foreground">{t.chapo}</p>
        </div>
      </div>

      {retour && (
        <p className={`mt-5 rounded-xl border px-4 py-3 text-[14px] ${
          retour === "ok" ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>
          {retour === "ok" ? t.merci : t.annule}
        </p>
      )}

      <ul className="mt-4">
        {superieures.map((cible) => {
          const f = formules.find((x) => x.id === cible);
          const diff = (prixPlan(cible) - prixPlan(plan)) / 100;
          return (
            <Ligne
              key={cible}
              titre={`${t.montee} ${f?.nom ?? cible}`}
              aide={`${f?.resume ?? ""} ${t.monteeAide}`}
              prix={`+${diff} €`}
              action={bouton("montee" + cible, () => void commander("montee", { planCible: cible }))}
            />
          );
        })}

        {!albumInclus && (
          <Ligne
            titre={t.album}
            aide={t.albumAide}
            prix={`${PRIX.album} €`}
            action={bouton("album", () => void commander("album"))}
          />
        )}

        <Ligne
          titre={t.mini}
          aide={t.miniAide}
          prix={`${PRIX.mini_album * quantiteMini} €`}
          action={
            <>
              <label className="sr-only" htmlFor="qte-mini">{t.quantite}</label>
              <select
                id="qte-mini"
                value={quantiteMini}
                onChange={(e) => setQuantiteMini(Number(e.target.value))}
                className="min-h-[36px] rounded-xl border border-border bg-background px-2 text-[14px]"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              {bouton("mini_album", () => void commander("mini_album", { quantite: quantiteMini }))}
            </>
          }
        />

        <Ligne
          titre={t.annee}
          aide={dateFermeture ? `${t.anneeAide} ${dateFermeture}. ${t.anneeAide2}` : t.anneeAide2}
          prix={`${PRIX.annee} €`}
          action={bouton("annee", () => void commander("annee"))}
        />
      </ul>

      {erreur && <p className="mt-3 text-[13.5px] text-destructive">{erreur}</p>}

      {commandes.length > 0 && (
        <div className="mt-6">
          <p className="label-mono">{t.vosCommandes}</p>
          <ul className="mt-2">
            {commandes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-3 border-t border-border py-2.5 text-[14px]">
                <span className="text-foreground">
                  {NOMS[l][c.produit] ?? c.produit}
                  {c.produit === "montee" && c.plan_cible ? ` (${c.plan_cible})` : ""}
                  {c.quantite > 1 ? ` × ${c.quantite}` : ""}
                </span>
                <span className="text-muted-foreground">
                  {new Date(c.cree_le).toLocaleDateString(l === "en" ? "en-GB" : "fr-FR")} ·{" "}
                  {(c.montant_centimes / 100).toFixed(2).replace(".", l === "en" ? "." : ",")} € ·{" "}
                  <span className="text-foreground">{t[c.statut] ?? c.statut}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default CarteCommandes;
