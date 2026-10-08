import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/* Les commandes à préparer, côté administration.
 *
 * Chaque album ou mini-album payé en ligne arrive ici, avec l'adresse de
 * livraison saisie sur la page de paiement. Le statut avance à la main :
 * payée, en fabrication, expédiée, livrée. Les mariés voient le même statut
 * dans leur espace.
 */

interface Ligne {
  id: string;
  event_id: string;
  produit: string;
  quantite: number;
  montant_centimes: number;
  plan_cible: string | null;
  statut: string;
  email: string | null;
  adresse_livraison: {
    name?: string;
    address?: { line1?: string; line2?: string; postal_code?: string; city?: string; country?: string };
  } | null;
  cree_le: string;
  events: { name: string } | null;
}

const NOMS: Record<string, string> = {
  album: "Album grand format", mini_album: "Mini-album", annee: "Année en ligne", montee: "Passage de formule",
};
const STATUTS = ["payee", "en_fabrication", "expediee", "livree", "annulee"];
const LIBELLES: Record<string, string> = {
  payee: "Payée", en_fabrication: "En fabrication", expediee: "Expédiée", livree: "Livrée", annulee: "Annulée",
};

const adresse = (a: Ligne["adresse_livraison"]) => {
  if (!a?.address) return "";
  const x = a.address;
  return [a.name, x.line1, x.line2, `${x.postal_code ?? ""} ${x.city ?? ""}`.trim(), x.country]
    .filter(Boolean).join(", ");
};

const CommandesAdmin = () => {
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from("commandes")
      .select("id, event_id, produit, quantite, montant_centimes, plan_cible, statut, email, adresse_livraison, cree_le, events(name)")
      .order("cree_le", { ascending: false })
      .limit(100);
    setLignes((data as unknown as Ligne[] | null) ?? []);
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  const changer = async (id: string, statut: string) => {
    setOccupe(id);
    await supabase.rpc("commande_statut", { p_commande: id, p_statut: statut });
    setOccupe(null);
    void charger();
  };

  return (
    <section className="mt-16">
      <h2 className="text-2xl">Commandes</h2>
      <p className="mt-2 max-w-[64ch] text-sm text-muted-foreground">
        Produits à la carte et passages de formule payés en ligne. Les albums se composent depuis la
        page de l'événement ; le statut que vous choisissez ici est celui que voient les mariés.
      </p>
      {!lignes ? (
        <Loader2 className="mt-6 h-5 w-5 animate-spin text-muted-foreground" />
      ) : lignes.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border px-6 py-10 text-center text-muted-foreground">
          Aucune commande pour l'instant.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Événement", "Produit", "Montant", "Livraison", "Statut"].map((c) => (
                  <th key={c} className="label-mono py-3 pr-4 font-normal">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id} className="border-b border-border align-top">
                  <td className="py-3 pr-4 font-mono tabular-nums">
                    {new Date(l.cree_le).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-3 pr-4">
                    <Link to={`/dashboard/event/${l.event_id}/album`} className="border-b border-foreground pb-0.5">
                      {l.events?.name ?? "Événement"}
                    </Link>
                    <span className="mt-1 block break-all text-xs text-muted-foreground">{l.email}</span>
                  </td>
                  <td className="py-3 pr-4">
                    {NOMS[l.produit] ?? l.produit}
                    {l.plan_cible ? ` (${l.plan_cible})` : ""}
                    {l.quantite > 1 ? ` × ${l.quantite}` : ""}
                  </td>
                  <td className="py-3 pr-4 font-mono tabular-nums">
                    {(l.montant_centimes / 100).toFixed(2).replace(".", ",")} €
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{adresse(l.adresse_livraison)}</td>
                  <td className="py-3">
                    <select
                      value={l.statut}
                      disabled={occupe === l.id}
                      onChange={(e) => void changer(l.id, e.target.value)}
                      className="min-h-[36px] rounded-xl border border-border bg-background px-2"
                    >
                      {STATUTS.map((s) => <option key={s} value={s}>{LIBELLES[s]}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default CommandesAdmin;
