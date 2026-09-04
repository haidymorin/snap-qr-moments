import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/* Le fichier clients, dans l'administration.
 *
 * Il sert à deux choses et à rien d'autre : voir qui est passé, et sortir un
 * fichier .csv à donner à un outil d'emailing.
 *
 * Deux populations, et il ne faut pas les confondre. Les CLIENTS ont payé :
 * ce sont eux qui disent le chiffre d'affaires, les formules qui marchent, les
 * types d'événements qui viennent. Les autres ont rempli le premier pas et se
 * sont arrêtés : utile à savoir, mais ce ne sont pas des clients.
 *
 * L'export destiné à la prospection ne contient que des clients n'ayant pas
 * coché la case d'opposition. La tolérance de l'article L34-5 vaut pour ses
 * propres clients, sur des produits analogues ; elle ne couvre pas quelqu'un
 * qui n'a jamais rien acheté. Écrire à celui-là demanderait son accord exprès,
 * qu'on ne lui a pas demandé.
 */

interface Client {
  id: string;
  email: string;
  prenom: string | null;
  nom: string | null;
  telephone: string | null;
  marketing: boolean;
  evenement_nom: string | null;
  evenement_date: string | null;
  evenement_type: string | null;
  formule_envisagee: string | null;
  a_achete: boolean;
  cree_le: string;
}

const jour = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

/* Un champ de CSV : guillemets doublés, et une apostrophe devant tout ce qui
   commence par =, + ou - — sans quoi Excel prend le contenu pour une formule
   et l'exécute. C'est une vraie faille, pas une coquetterie. */
const cellule = (v: unknown) => {
  const s = String(v ?? "");
  const sur = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${sur.replace(/"/g, '""')}"`;
};

const telecharger = (nom: string, lignes: string[][]) => {
  /* Le BOM force Excel à lire l'UTF-8 : sans lui, tous les accents cassent. */
  const csv = "﻿" + lignes.map((l) => l.map(cellule).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
};

const FichierClients = () => {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [refuse, setRefuse] = useState(false);
  const [filtre, setFiltre] = useState<"clients" | "sansAchat" | "tous">("clients");

  const charger = useCallback(async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("id,email,prenom,nom,telephone,marketing,evenement_nom,evenement_date,evenement_type,formule_envisagee,a_achete,cree_le")
      .order("cree_le", { ascending: false });
    if (error) { setRefuse(true); return; }
    setClients((data ?? []) as Client[]);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const visibles = useMemo(() => {
    const l = clients ?? [];
    if (filtre === "clients") return l.filter((c) => c.a_achete);
    if (filtre === "sansAchat") return l.filter((c) => !c.a_achete);
    return l;
  }, [clients, filtre]);

  const bilan = useMemo(() => {
    const l = clients ?? [];
    const acheteurs = l.filter((c) => c.a_achete);
    return {
      total: l.length,
      acheteurs: acheteurs.length,
      abandons: l.length - acheteurs.length,
      /* Les seuls à qui on a le droit d'écrire une offre. */
      prospectables: acheteurs.filter((c) => c.marketing).length,
    };
  }, [clients]);

  const exporter = (pourProspection: boolean) => {
    const source = (clients ?? []).filter((c) =>
      pourProspection ? c.a_achete && c.marketing : true,
    );
    const entetes = [
      "email", "prenom", "nom", "telephone", "accepte_prospection",
      "evenement", "date_evenement", "type", "formule_envisagee", "a_achete", "premier_contact",
    ];
    const lignes = [entetes, ...source.map((c) => [
      c.email, c.prenom ?? "", c.nom ?? "", c.telephone ?? "", c.marketing ? "oui" : "non",
      c.evenement_nom ?? "", c.evenement_date ?? "", c.evenement_type ?? "",
      c.formule_envisagee ?? "", c.a_achete ? "oui" : "non", c.cree_le.slice(0, 10),
    ])];
    const date = new Date().toISOString().slice(0, 10);
    telecharger(
      pourProspection
        ? `qr-memories-prospection-${date}.csv`
        : `qr-memories-fichier-complet-${date}.csv`,
      lignes,
    );
  };

  if (refuse) return null;
  if (!clients) return <Loader2 className="mt-10 h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <section className="mt-[clamp(48px,6vw,88px)]">
      <h2 className="text-[clamp(24px,3vw,34px)]">Fichier clients</h2>
      <p className="mt-2 max-w-[64ch] text-[14.5px] leading-relaxed text-muted-foreground">
        Les clients sont ceux qui ont payé : c'est la liste qui compte pour suivre l'activité.
        Les autres ont commencé une création sans la finir ; on les garde pour comprendre où
        ils s'arrêtent, pas pour leur écrire. L'export de prospection ne contient donc que des
        clients n'ayant pas coché la case d'opposition.
      </p>

      <dl className="mt-8 grid gap-px rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Clients", String(bilan.acheteurs)],
          ["Créations non finies", String(bilan.abandons)],
          ["Contactables", String(bilan.prospectables)],
          ["Total en base", String(bilan.total)],
        ].map(([titre, valeur]) => (
          <div key={titre} className="bg-background p-5">
            <dt className="label-mono">{titre}</dt>
            <dd className="mt-2 font-mono text-[clamp(24px,3vw,32px)] tabular-nums">{valeur}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {([
          ["clients", "Clients"],
          ["sansAchat", "Créations non finies"],
          ["tous", "Tout le fichier"],
        ] as const).map(([k, l]) => (
          <button
            key={k} type="button" onClick={() => setFiltre(k)}
            className={`label-mono min-h-[40px] rounded-full border px-4 transition-colors ${
              filtre === k ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"
            }`}
          >
            {l}
          </button>
        ))}

        <span aria-hidden className="hidden h-6 w-px bg-border sm:block" />

        <button
          type="button" onClick={() => exporter(true)}
          className="label-mono min-h-[40px] rounded-full border border-foreground px-4 text-foreground transition-opacity hover:opacity-60"
        >
          Export prospection ({bilan.prospectables})
        </button>
        <button
          type="button" onClick={() => exporter(false)}
          className="label-mono min-h-[40px] rounded-full border border-border px-4 transition-colors hover:border-primary"
        >
          Export du fichier complet ({bilan.total})
        </button>
      </div>

      {visibles.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border px-6 py-12 text-center text-muted-foreground">
          Rien à afficher pour ce filtre.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Contact", "Téléphone", "Événement", "Date", "Formule", "Achat", "Prospection", "Vu le"].map((c) => (
                  <th key={c} className="label-mono py-3 pr-4 font-normal">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibles.map((c) => (
                <tr key={c.id} className="border-b border-border align-top">
                  <td className="py-3 pr-4">
                    <span className="block">{[c.prenom, c.nom].filter(Boolean).join(" ") || "—"}</span>
                    <span className="mt-1 block break-all text-xs text-muted-foreground">{c.email}</span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{c.telephone ?? "—"}</td>
                  <td className="py-3 pr-4">{c.evenement_nom ?? "—"}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{jour(c.evenement_date)}</td>
                  <td className="py-3 pr-4 capitalize">{c.formule_envisagee ?? "—"}</td>
                  <td className="py-3 pr-4">{c.a_achete ? "payé" : "—"}</td>
                  <td className="py-3 pr-4">{c.marketing ? "oui" : "refusée"}</td>
                  <td className="py-3 pr-4 font-mono tabular-nums">{jour(c.cree_le)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default FichierClients;
