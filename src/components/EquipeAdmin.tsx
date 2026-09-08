import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Gift } from "lucide-react";

/* L'équipe, et les cadeaux.
 *
 * Deux formulaires, un principe commun : on désigne quelqu'un par son adresse
 * e-mail, qu'il ait déjà un compte ou non. S'il n'en a pas, l'invitation
 * attend et s'applique toute seule à l'inscription — c'est le déclencheur posé
 * dans la migration qui s'en charge, pas cet écran.
 *
 * Le choix « album offert » est isolé et explicite, parce que c'est le seul
 * endroit de l'application où une case à cocher engage de l'argent réel.
 */

interface Membre {
  user_id: string | null;
  email: string;
  depuis: string;
  fondatrice: boolean;
  en_attente: boolean;
}

const EquipeAdmin = () => {
  const [equipe, setEquipe] = useState<Membre[]>([]);
  const [chargement, setChargement] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const [emailAdmin, setEmailAdmin] = useState("");
  const [envoiAdmin, setEnvoiAdmin] = useState(false);

  const [cadeau, setCadeau] = useState({
    email: "", nom: "", date: "", type: "mariage", plan: "heritage", albums: false,
  });
  const [envoiCadeau, setEnvoiCadeau] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    const { data } = await supabase.rpc("admin_lister_equipe");
    setEquipe((data as Membre[] | null) ?? []);
    setChargement(false);
  }, []);

  useEffect(() => { void charger(); }, [charger]);

  const ajouter = async () => {
    setEnvoiAdmin(true); setNote(null);
    const { data, error } = await supabase.rpc("admin_ajouter_admin", { p_email: emailAdmin });
    setEnvoiAdmin(false);
    if (error) { setNote(error.message); return; }
    setNote(data === "invite"
      ? "Cette personne n'a pas encore de compte : elle deviendra administratrice dès son inscription."
      : "Administrateur ajouté.");
    setEmailAdmin("");
    void charger();
  };

  const retirer = async (email: string) => {
    setNote(null);
    const { error } = await supabase.rpc("admin_retirer_admin", { p_email: email });
    if (error) { setNote(error.message); return; }
    void charger();
  };

  const offrir = async () => {
    setEnvoiCadeau(true); setNote(null);
    const { data, error } = await supabase.rpc("admin_offrir_evenement", {
      p_email: cadeau.email,
      p_nom: cadeau.nom,
      p_date: cadeau.date,
      p_type: cadeau.type,
      p_plan: cadeau.plan,
      p_albums_offerts: cadeau.albums,
    });
    setEnvoiCadeau(false);
    if (error) { setNote(error.message); return; }
    setNote(data === "invite"
      ? "Cette personne n'a pas encore de compte : l'événement sera créé dès son inscription avec cette adresse."
      : "Événement créé et rattaché à son compte.");
    setCadeau({ email: "", nom: "", date: "", type: "mariage", plan: "heritage", albums: false });
  };

  const champ = "mt-1 w-full rounded-xl border border-border bg-background p-2.5 text-[15px]";

  return (
    <>
      <section className="mt-12 rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl">
          <ShieldCheck className="h-5 w-5 text-primary" /> Les administrateurs
        </h2>
        <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">
          Un administrateur voit tous les événements, tous les paiements, et peut agir sur
          n'importe quel compte. À n'accorder qu'à quelqu'un dont c'est le métier.
        </p>

        {chargement ? (
          <Loader2 className="mt-4 h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {equipe.map((m) => (
              <li key={m.email} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-[15px]">
                  {m.email}
                  {m.fondatrice && <span className="label-mono ml-3 text-primary">fondatrice</span>}
                  {m.en_attente && <span className="label-mono ml-3 text-muted-foreground">en attente</span>}
                </span>
                {!m.fondatrice && (
                  <button
                    type="button"
                    onClick={() => void retirer(m.email)}
                    className="label-mono border-b border-foreground pb-1"
                  >
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="min-w-[260px] flex-1">
            <span className="label-mono">Adresse e-mail</span>
            <input
              type="email"
              value={emailAdmin}
              onChange={(e) => setEmailAdmin(e.target.value)}
              className={champ}
            />
          </label>
          <Button variant="hero" disabled={envoiAdmin || !emailAdmin.includes("@")} onClick={() => void ajouter()}>
            {envoiAdmin && <Loader2 className="h-4 w-4 animate-spin" />} Nommer administrateur
          </Button>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl">
          <Gift className="h-5 w-5 text-primary" /> Offrir un événement
        </h2>
        <p className="mt-2 max-w-[62ch] text-sm text-muted-foreground">
          L'événement est créé au nom de la personne, sans paiement. Si elle n'a pas encore de
          compte, il l'attendra : il apparaîtra tout seul quand elle s'inscrira avec cette adresse.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label-mono">Adresse e-mail du destinataire</span>
            <input type="email" value={cadeau.email}
              onChange={(e) => setCadeau({ ...cadeau, email: e.target.value })} className={champ} />
          </label>
          <label>
            <span className="label-mono">Nom de l'événement</span>
            <input value={cadeau.nom}
              onChange={(e) => setCadeau({ ...cadeau, nom: e.target.value })} className={champ} />
          </label>
          <label>
            <span className="label-mono">Date</span>
            <input type="date" value={cadeau.date}
              onChange={(e) => setCadeau({ ...cadeau, date: e.target.value })} className={champ} />
          </label>
          <label>
            <span className="label-mono">Formule</span>
            <select value={cadeau.plan}
              onChange={(e) => setCadeau({ ...cadeau, plan: e.target.value })} className={champ}>
              <option value="essentiel">Essentiel</option>
              <option value="souvenir">Souvenir</option>
              <option value="heritage">Héritage</option>
            </select>
          </label>
        </div>

        {/* Le seul endroit de l'application où une case engage de l'argent. */}
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-border p-4">
          <input
            type="checkbox"
            checked={cadeau.albums}
            onChange={(e) => setCadeau({ ...cadeau, albums: e.target.checked })}
            className="mt-1"
          />
          <span className="text-sm">
            <strong>J'offre aussi les albums imprimés.</strong>
            <span className="mt-1 block text-muted-foreground">
              Décoché, la galerie est offerte mais les albums restent à la charge de la personne,
              qui les paie par carte comme n'importe quel client. Coché, c'est vous qui payez
              l'impression et l'expédition.
            </span>
          </span>
        </label>

        <Button
          variant="hero"
          className="mt-5"
          disabled={envoiCadeau || !cadeau.email.includes("@") || !cadeau.nom.trim() || !cadeau.date}
          onClick={() => void offrir()}
        >
          {envoiCadeau && <Loader2 className="h-4 w-4 animate-spin" />} Créer l'événement offert
        </Button>
      </section>

      {note && <p className="mt-4 text-sm text-muted-foreground">{note}</p>}
    </>
  );
};

export default EquipeAdmin;
