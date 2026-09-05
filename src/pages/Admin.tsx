import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";
import FichierClients from "@/components/FichierClients";
import ActionsEvenement from "@/components/ActionsEvenement";

/* L'espace d'administration.
 *
 * Une seule page, et une seule question à laquelle elle répond : où en est
 * l'activité. Combien d'événements, chez qui, payés combien, et lesquels
 * arrivent à échéance.
 *
 * Tout vient d'une fonction serveur qui vérifie le rôle avant de rendre quoi
 * que ce soit. Le contrôle est dans le même objet que la donnée : une page qui
 * se contenterait de cacher un bouton laisserait la porte ouverte à quiconque
 * saurait taper l'adresse.
 */

interface Ligne {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
  plan: string;
  statut: string;
  paye_le: string | null;
  expire_le: string | null;
  email: string | null;
  medias: number;
  messages: number;
  montant_centimes: number | null;
}

const euros = (centimes: number | null) =>
  centimes == null ? "—" : `${(centimes / 100).toLocaleString("fr-FR")} €`;

const jour = (iso: string | null) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "2-digit",
      })
    : "—";

const Admin = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [lignes, setLignes] = useState<Ligne[] | null>(null);
  const [refuse, setRefuse] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?mode=signin", { replace: true });
  }, [user, loading, navigate]);

  const charger = useCallback(async () => {
    const { data, error } = await supabase.rpc("admin_evenements");
    if (error) { setRefuse(true); return; }
    setLignes((data ?? []) as unknown as Ligne[]);
  }, []);

  useEffect(() => { if (user) charger(); }, [user, charger]);

  /* Le chiffre d'affaires encaissé, les événements ouverts, et ceux dont
     l'hébergement se termine dans le mois — ce sont les trois seules choses
     qui appellent une décision. */
  const bilan = useMemo(() => {
    const l = lignes ?? [];
    const dansUnMois = new Date();
    dansUnMois.setMonth(dansUnMois.getMonth() + 1);
    return {
      encaisse: l.reduce((s, x) => s + (x.montant_centimes ?? 0), 0),
      actifs: l.filter((x) => x.statut === "actif").length,
      medias: l.reduce((s, x) => s + Number(x.medias ?? 0), 0),
      echeance: l.filter(
        (x) => x.expire_le && new Date(x.expire_le) <= dansUnMois && x.statut === "actif",
      ).length,
    };
  }, [lignes]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto w-full max-w-[1180px] px-[clamp(20px,5vw,48px)] py-[clamp(48px,7vw,88px)]">
        <p className="eyebrow">Administration</p>
        <h1 className="mt-3 text-[clamp(30px,4.5vw,52px)]">Tous les événements</h1>

        {refuse || (lignes && lignes.length === 0 && !bilan.actifs) ? (
          <p className="mt-8 rounded-xl border border-border px-6 py-12 text-center text-muted-foreground">
            {refuse
              ? "Ce compte n'a pas le rôle administrateur."
              : "Aucun événement pour l'instant."}
          </p>
        ) : !lignes ? (
          <Loader2 className="mt-10 h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <>
            <dl className="mt-10 grid gap-px rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Encaissé", euros(bilan.encaisse)],
                ["Événements actifs", String(bilan.actifs)],
                ["Photos et vidéos", bilan.medias.toLocaleString("fr-FR")],
                ["Échéances sous 30 jours", String(bilan.echeance)],
              ].map(([titre, valeur]) => (
                <div key={titre} className="bg-background p-5">
                  <dt className="label-mono">{titre}</dt>
                  <dd className="mt-2 font-mono text-[clamp(24px,3vw,32px)] tabular-nums">
                    {valeur}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Événement", "Client", "Formule", "Date", "Payé", "Médias", "Mots", "Échéance", ""].map((c) => (
                      <th key={c} className="label-mono py-3 pr-4 font-normal">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l) => (
                    <tr key={l.id} className="border-b border-border align-top">
                      <td className="py-3 pr-4">
                        <Link to={`/dashboard/event/${l.id}`} className="border-b border-foreground pb-0.5">
                          {l.name}
                        </Link>
                        <span className="mt-1 block text-xs capitalize text-muted-foreground">
                          {l.event_type}
                          {l.statut !== "actif" && ` · ${l.statut}`}
                        </span>
                      </td>
                      <td className="py-3 pr-4 break-all text-muted-foreground">{l.email ?? "—"}</td>
                      <td className="py-3 pr-4 capitalize">{l.plan}</td>
                      <td className="py-3 pr-4 font-mono tabular-nums">{jour(l.event_date)}</td>
                      <td className="py-3 pr-4 font-mono tabular-nums">{euros(l.montant_centimes)}</td>
                      <td className="py-3 pr-4 font-mono tabular-nums">{l.medias}</td>
                      <td className="py-3 pr-4 font-mono tabular-nums">{l.messages}</td>
                      <td className="py-3 pr-4 font-mono tabular-nums">{jour(l.expire_le)}</td>
                      <td className="py-3">
                        <ActionsEvenement
                          event={{
                            id: l.id, name: l.name, event_date: l.event_date,
                            plan: l.plan, expire_le: l.expire_le,
                          }}
                          onFait={charger}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!refuse && <FichierClients />}
      </main>
      <Footer />
    </div>
  );
};

export default Admin;
