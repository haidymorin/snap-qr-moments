import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, Mail } from "lucide-react";

/* Les demandes reçues, dans l'administration.
 *
 * Elles étaient déjà écrites en base et personne ne les regardait : seule la
 * notification Resend les signalait, et un e-mail manqué était une demande
 * perdue. Ce panneau est la deuxième chance.
 *
 * Deux populations à ne pas mélanger :
 *
 *   · les RÉSERVATIONS DE DATE, laissées avant l'ouverture des commandes.
 *     Ce sont des mariages à venir, avec une date. C'est la liste à traiter
 *     le jour de l'immatriculation, et elle se lit par date de mariage —
 *     un mariage en avril passe avant un mariage en septembre, même s'il a
 *     été réservé plus tard.
 *
 *   · les QUESTIONS, posées par le formulaire de contact. Elles se lisent
 *     par ordre d'arrivée, parce qu'elles attendent une réponse.
 *
 * Marquer traitée n'efface rien : ça pose une date. On ne supprime pas une
 * demande, on la sort de la file.
 */

interface Demande {
  id: string;
  nom: string;
  email: string;
  type_evenement: string | null;
  date_evenement: string | null;
  message: string | null;
  traitee_le: string | null;
  cree_le: string;
}

const jour = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

/** Une réservation se reconnaît à son type, écrit par la page /reserver. */
const estReservation = (d: Demande) =>
  (d.type_evenement ?? "").toLowerCase().startsWith("réservation");

/** Dans combien de jours le mariage, ou null si la date manque. */
const joursAvant = (d: string | null) => {
  if (!d) return null;
  const ms = new Date(d + "T12:00:00").getTime() - Date.now();
  return Math.round(ms / 86_400_000);
};

const DemandesRecues = () => {
  const [demandes, setDemandes] = useState<Demande[] | null>(null);
  const [refuse, setRefuse] = useState(false);
  const [vue, setVue] = useState<"reservations" | "questions" | "traitees">("reservations");
  const [ouverte, setOuverte] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const { data, error } = await supabase
      .from("demandes_contact")
      .select("id,nom,email,type_evenement,date_evenement,message,traitee_le,cree_le")
      .order("cree_le", { ascending: false });
    if (error) { setRefuse(true); return; }
    setDemandes((data ?? []) as Demande[]);
  }, []);

  useEffect(() => { charger(); }, [charger]);

  const marquer = async (id: string, traitee: boolean) => {
    const valeur = traitee ? new Date().toISOString() : null;
    /* Optimiste : la ligne bouge tout de suite, la base suit. */
    setDemandes((l) => (l ?? []).map((d) => (d.id === id ? { ...d, traitee_le: valeur } : d)));
    const { error } = await supabase
      .from("demandes_contact")
      .update({ traitee_le: valeur })
      .eq("id", id);
    if (error) charger();
  };

  const listes = useMemo(() => {
    const l = demandes ?? [];
    const enAttente = l.filter((d) => !d.traitee_le);
    return {
      /* Par date de mariage : c'est l'urgence réelle, pas l'ordre d'arrivée. */
      reservations: enAttente
        .filter(estReservation)
        .sort((a, b) => (a.date_evenement ?? "9999").localeCompare(b.date_evenement ?? "9999")),
      questions: enAttente.filter((d) => !estReservation(d)),
      traitees: l.filter((d) => d.traitee_le),
    };
  }, [demandes]);

  if (refuse) return null;
  if (!demandes) return <Loader2 className="mt-10 h-6 w-6 animate-spin text-muted-foreground" />;

  const visibles = listes[vue];

  const onglet = (id: typeof vue, libelle: string, n: number) => (
    <button
      key={id}
      type="button"
      onClick={() => setVue(id)}
      className={
        "rounded-xl border px-3 py-2 text-[13.5px] transition-colors "
        + (vue === id ? "border-primary bg-secondary text-foreground" : "border-border hover:border-primary/60")
      }
    >
      {libelle} <span className="ml-1 font-mono tabular-nums text-muted-foreground">{n}</span>
    </button>
  );

  return (
    <section className="mt-[clamp(48px,6vw,88px)]">
      <h2 className="text-[clamp(24px,3vw,34px)]">Demandes reçues</h2>
      <p className="mt-2 max-w-[64ch] text-[14.5px] leading-relaxed text-muted-foreground">
        Les réservations de date sont classées par date de mariage, pas par ordre d'arrivée :
        c'est celle d'avril qu'il faut rappeler d'abord. Les questions, elles, attendent une
        réponse et se lisent dans l'ordre. Marquer traitée ne supprime rien — ça sort la
        demande de la file.
      </p>

      <div className="mt-7 flex flex-wrap gap-2">
        {onglet("reservations", "Réservations", listes.reservations.length)}
        {onglet("questions", "Questions", listes.questions.length)}
        {onglet("traitees", "Traitées", listes.traitees.length)}
      </div>

      {visibles.length === 0 ? (
        <p className="mt-7 text-[14px] text-muted-foreground">Rien ici pour l'instant.</p>
      ) : (
        <ul className="mt-7 divide-y divide-border rounded-2xl border border-border">
          {visibles.map((d) => {
            const j = joursAvant(d.date_evenement);
            return (
              <li key={d.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <strong className="text-[15.5px] font-semibold text-foreground">{d.nom}</strong>
                  {d.date_evenement && (
                    <span className="font-mono text-[13.5px] tabular-nums text-foreground">
                      {jour(d.date_evenement)}
                      {j !== null && j >= 0 && (
                        <span className="ml-2 text-muted-foreground">dans {j} j</span>
                      )}
                    </span>
                  )}
                  {d.type_evenement && (
                    <span className="label-mono">{d.type_evenement}</span>
                  )}
                  <span className="ml-auto font-mono text-[12.5px] tabular-nums text-muted-foreground">
                    reçue le {jour(d.cree_le)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <a
                    href={"mailto:" + d.email}
                    className="inline-flex items-center gap-2 text-[13.5px] text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5" /> {d.email}
                  </a>
                  {d.message && (
                    <button
                      type="button"
                      onClick={() => setOuverte(ouverte === d.id ? null : d.id)}
                      className="text-[13.5px] text-muted-foreground underline decoration-border hover:text-foreground"
                    >
                      {ouverte === d.id ? "Masquer le détail" : "Voir le détail"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => marquer(d.id, !d.traitee_le)}
                    className="ml-auto inline-flex items-center gap-2 rounded-xl border border-border px-3 py-1.5 text-[13px] transition-colors hover:border-primary"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {d.traitee_le ? "Remettre dans la file" : "Marquer traitée"}
                  </button>
                </div>

                {ouverte === d.id && d.message && (
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-secondary p-4 font-mono text-[12.5px] leading-relaxed text-foreground">
                    {d.message}
                  </pre>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default DemandesRecues;
