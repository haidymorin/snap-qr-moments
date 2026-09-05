import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/* Les gestes d'administration sur un événement.
 *
 * Quatre demandes reviennent sans cesse chez tous les services qui vendent une
 * prestation datée : j'ai reporté, je veux la formule au-dessus, ma galerie
 * ferme, retirez cette photo. Elles n'ont rien d'exceptionnel, et elles ne
 * doivent surtout pas remonter jusqu'à quelqu'un qui sait écrire du SQL.
 *
 * Tout passe par des fonctions serveur : la page n'a aucun droit d'écriture
 * sur les tables. Elle ne peut donc rien faire d'autre que ces quatre gestes,
 * même si quelqu'un s'amusait à la réécrire depuis la console du navigateur.
 *
 * Chaque action demande une confirmation explicite en toutes lettres, et pas
 * une fenêtre « êtes-vous sûr » que l'on valide sans lire : on tape la date,
 * on choisit la durée, on voit ce qui va se passer.
 */

const PLANS = [
  { id: "essentiel", nom: "Essentiel", prix: 5900 },
  { id: "souvenir", nom: "Souvenir", prix: 17900 },
  { id: "heritage", nom: "Héritage", prix: 39000 },
];

const MOTIFS: Record<string, string> = {
  reserve_admin: "Ce compte n'a pas le rôle administrateur.",
  date_invalide: "Cette date n'est pas valide.",
  palier_inconnu: "Cette formule n'existe pas.",
  duree_invalide: "La durée doit être comprise entre 1 et 60 mois.",
  evenement_inconnu: "Cet événement n'existe plus.",
  evenement_paye_ou_inconnu:
    "Un événement payé ne se supprime pas ici. Il faut le rembourser puis l'archiver.",
};

interface Props {
  event: { id: string; name: string; event_date: string; plan: string; expire_le: string | null };
  onFait: () => void;
}

const bouton =
  "inline-flex min-h-[38px] items-center justify-center rounded-full border border-border px-4 text-[13px] transition-colors hover:border-primary disabled:opacity-50";
const boutonPlein =
  "inline-flex min-h-[38px] items-center justify-center gap-2 rounded-full border border-primary bg-primary px-4 text-[13px] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:opacity-60";
const champ =
  "min-h-[38px] rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-primary";

const ActionsEvenement = ({ event, onFait }: Props) => {
  const [ouvert, setOuvert] = useState(false);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [panne, setPanne] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const [date, setDate] = useState(event.event_date?.slice(0, 10) ?? "");
  const [plan, setPlan] = useState(event.plan);
  const [complement, setComplement] = useState("");
  const [mois, setMois] = useState("12");
  const [confirmeSuppression, setConfirmeSuppression] = useState("");

  const lancer = async (cle: string, appel: () => Promise<{ error: unknown }>, message: string) => {
    setOccupe(cle);
    setPanne(null);
    setFait(null);
    const { error } = await appel();
    setOccupe(null);
    if (error) {
      const brut = (error as { message?: string }).message ?? "";
      const code = Object.keys(MOTIFS).find((m) => brut.includes(m));
      setPanne(code ? MOTIFS[code] : brut || "L'opération a échoué.");
      return;
    }
    setFait(message);
    onFait();
  };

  /* L'écart de tarif entre la formule actuelle et la nouvelle, proposé comme
     complément. C'est une suggestion, pas une règle : un geste commercial
     doit rester possible, et c'est le montant réellement encaissé qui compte
     dans le chiffre d'affaires. */
  const ecart = () => {
    const a = PLANS.find((p) => p.id === event.plan)?.prix ?? 0;
    const b = PLANS.find((p) => p.id === plan)?.prix ?? 0;
    return Math.max(0, b - a);
  };

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className={bouton}>
        Gérer
      </button>
    );
  }

  return (
    <div className="mt-3 w-[min(560px,80vw)] space-y-5 rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-foreground">{event.name}</p>
          <p className="label-mono mt-1">Actions d'administration</p>
        </div>
        <button type="button" onClick={() => setOuvert(false)} className="label-mono hover:text-foreground">
          Fermer
        </button>
      </div>

      {panne && (
        <p className="rounded-xl border border-destructive px-3 py-2 text-[13px] text-destructive">{panne}</p>
      )}
      {fait && (
        <p className="rounded-xl border border-primary px-3 py-2 text-[13px] text-foreground">{fait}</p>
      )}

      {/* Reporter */}
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-[13.5px] font-semibold text-foreground">Reporter l'événement</p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          La date de fermeture de la galerie se décale d'autant. Une prolongation déjà accordée
          est conservée.
        </p>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={champ} />
          <button
            type="button"
            className={boutonPlein}
            disabled={occupe !== null || !date || date === event.event_date?.slice(0, 10)}
            onClick={() =>
              lancer("report",
                () => supabase.rpc("admin_reporter", { p_event: event.id, p_date: date }),
                `Événement reporté au ${new Date(`${date}T12:00:00`).toLocaleDateString("fr-FR")}.`)
            }
          >
            {occupe === "report" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Reporter
          </button>
        </div>
      </div>

      {/* Formule */}
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-[13.5px] font-semibold text-foreground">Changer de formule</p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Le complément saisi s'ajoute au montant encaissé. Corrigez-le si vous avez fait un geste.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={champ}>
            {PLANS.map((p) => (
              <option key={p.id} value={p.id}>{p.nom}</option>
            ))}
          </select>
          <input
            type="number" min="0" step="1" className={`${champ} w-[130px]`}
            placeholder={`${(ecart() / 100).toFixed(0)} €`}
            value={complement} onChange={(e) => setComplement(e.target.value)}
          />
          <span className="text-[12.5px] text-muted-foreground">€ encaissés en plus</span>
          <button
            type="button"
            className={boutonPlein}
            disabled={occupe !== null || plan === event.plan}
            onClick={() =>
              lancer("formule",
                () => supabase.rpc("admin_changer_formule", {
                  p_event: event.id,
                  p_plan: plan,
                  p_complement_centimes: Math.round(
                    (complement === "" ? ecart() / 100 : Number(complement)) * 100,
                  ),
                }),
                "Formule changée.")
            }
          >
            {occupe === "formule" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Changer
          </button>
        </div>
      </div>

      {/* Prolonger */}
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-[13.5px] font-semibold text-foreground">Prolonger l'hébergement</p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Échéance actuelle : {event.expire_le ? new Date(event.expire_le).toLocaleDateString("fr-FR") : "—"}.
          Le rappel des trente jours repartira sur la nouvelle date.
        </p>
        <div className="flex flex-wrap gap-2">
          <select value={mois} onChange={(e) => setMois(e.target.value)} className={champ}>
            <option value="6">6 mois</option>
            <option value="12">12 mois</option>
            <option value="24">24 mois</option>
          </select>
          <button
            type="button"
            className={boutonPlein}
            disabled={occupe !== null}
            onClick={() =>
              lancer("prolonge",
                () => supabase.rpc("admin_prolonger", { p_event: event.id, p_mois: Number(mois) }),
                `Hébergement prolongé de ${mois} mois.`)
            }
          >
            {occupe === "prolonge" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Prolonger
          </button>
        </div>
      </div>

      {/* Supprimer, réservé aux événements sans paiement */}
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-[13.5px] font-semibold text-foreground">Supprimer</p>
        <p className="text-[12.5px] leading-relaxed text-muted-foreground">
          Réservé aux événements de test, sans paiement. Tapez <b>SUPPRIMER</b> pour confirmer.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className={`${champ} w-[150px]`} value={confirmeSuppression}
            onChange={(e) => setConfirmeSuppression(e.target.value)} placeholder="SUPPRIMER"
          />
          <button
            type="button"
            className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-destructive px-4 text-[13px] text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40"
            disabled={occupe !== null || confirmeSuppression !== "SUPPRIMER"}
            onClick={() =>
              lancer("suppr",
                () => supabase.rpc("admin_supprimer_evenement", { p_event: event.id }),
                "Événement supprimé.")
            }
          >
            {occupe === "suppr" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Supprimer définitivement
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionsEvenement;
