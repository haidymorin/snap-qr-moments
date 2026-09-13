import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, MailCheck } from "lucide-react";
import { useLanguage, Lang } from "@/contexts/LanguageContext";

/* Le mot de remerciement, programmé pour le lendemain soir.
 *
 * Ce n'est pas une politesse, c'est le moment le plus rentable de tout le
 * parcours. Le soir du mariage, les invités déposent ce qu'ils ont sous la
 * main. Le lendemain vers 20 h, sur leur canapé, ils trient enfin leurs
 * photos de la veille — et personne, jamais, ne pense à les relancer à cet
 * instant-là. Les mariés, eux, dorment ou sont partis. Donc le message
 * s'écrit avant, se programme, et part tout seul.
 *
 * Deux garde-fous, et ils ne se négocient pas :
 *
 *   · les destinataires sont uniquement les invités qui ont laissé leur
 *     adresse dans la galerie pour en recevoir le lien. On ne fabrique pas
 *     une liste de diffusion à partir d'un mariage ;
 *   · le nombre de destinataires est affiché AVANT l'écriture. On n'écrit
 *     pas le même mot pour trois personnes et pour quatre-vingts.
 */

const MAX = 600;

/** Le lendemain de l'événement, à 20 h, heure locale du navigateur. */
const lendemainVingtHeures = (dateEvenement: string) => {
  const d = new Date(dateEvenement + "T20:00:00");
  d.setDate(d.getDate() + 1);
  return d;
};

/** Le format attendu par <input type="datetime-local">, sans décalage UTC. */
const pourChamp = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const T: Record<Lang, Record<string, string>> = {
  fr: {
    titre: "Le mot du lendemain",
    chapo:
      "Vos invités trient leurs photos le lendemain soir, pas pendant la soirée. Écrivez votre mot maintenant : il partira tout seul, avec le lien de la galerie, pendant que vous serez ailleurs.",
    destinataires: "invités recevront ce message",
    aucun:
      "Aucun invité n'a encore laissé son adresse. Elle leur est proposée dans la galerie, après leur premier dépôt — le message attendra qu'il y en ait.",
    votreMot: "Votre mot",
    exemple:
      "Merci d'être venus. On a dansé jusqu'à 4 h grâce à vous.\n\nSi vous avez encore des photos sur votre téléphone, c'est le moment — le lien est juste en dessous.",
    quand: "Envoi programmé",
    quandAide: "Par défaut, le lendemain du mariage à 20 h.",
    enregistrer: "Programmer l'envoi",
    annuler: "Annuler l'envoi",
    enregistre: "Envoi programmé.",
    annule: "Envoi annulé.",
    envoye: "Message envoyé le",
    erreur: "L'enregistrement a échoué.",
    restants: "caractères restants",
  },
  en: {
    titre: "The morning-after note",
    chapo:
      "Your guests sort their photos the next evening, not during the party. Write your note now: it goes out on its own, with the gallery link, while you are somewhere else.",
    destinataires: "guests will receive this message",
    aucun:
      "No guest has left an address yet. They are offered the option in the gallery after their first upload — the message will wait until someone has.",
    votreMot: "Your note",
    exemple:
      "Thank you for coming. We danced until 4 a.m. because of you.\n\nIf you still have photos on your phone, now is the moment — the link is just below.",
    quand: "Scheduled for",
    quandAide: "By default, the day after the wedding at 8 p.m.",
    enregistrer: "Schedule it",
    annuler: "Cancel the send",
    enregistre: "Scheduled.",
    annule: "Send cancelled.",
    envoye: "Message sent on",
    erreur: "Saving failed.",
    restants: "characters left",
  },
};

interface Props {
  eventId: string;
  eventDate: string;
  texte: string | null;
  envoiLe: string | null;
  envoyeLe: string | null;
  onChange: (v: { merci_texte: string | null; merci_envoi_le: string | null }) => void;
}

const CarteMerci = ({ eventId, eventDate, texte, envoiLe, envoyeLe, onChange }: Props) => {
  const { lang } = useLanguage();
  const t = T[lang === "en" ? "en" : "fr"];

  const [mot, setMot] = useState(texte ?? "");
  const [quand, setQuand] = useState(
    envoiLe ? pourChamp(new Date(envoiLe)) : pourChamp(lendemainVingtHeures(eventDate)),
  );
  const [combien, setCombien] = useState<number | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const compter = useCallback(async () => {
    const { data, error } = await supabase.rpc("merci_destinataires" as never, {
      p_event_id: eventId,
    } as never);
    if (!error) setCombien((data as number) ?? 0);
  }, [eventId]);

  useEffect(() => { void compter(); }, [compter]);

  const enregistrer = async (actif: boolean) => {
    setOccupe(true);
    setNote(null);
    const valeurs = actif
      ? { merci_texte: mot.trim(), merci_envoi_le: new Date(quand).toISOString() }
      : { merci_texte: mot.trim() || null, merci_envoi_le: null };

    const { error } = await supabase
      .from("events")
      .update(valeurs as never)
      .eq("id", eventId);

    if (error) setNote(t.erreur);
    else {
      onChange(valeurs as { merci_texte: string | null; merci_envoi_le: string | null });
      setNote(actif ? t.enregistre : t.annule);
    }
    setOccupe(false);
  };

  const dejaParti = Boolean(envoyeLe);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h2 className="text-[17px] font-semibold text-foreground">{t.titre}</h2>
          <p className="mt-1 max-w-[64ch] text-[14px] leading-relaxed text-muted-foreground">
            {t.chapo}
          </p>
        </div>
      </div>

      {dejaParti ? (
        <p className="mt-5 text-[14px] text-muted-foreground">
          {t.envoye}{" "}
          <b className="text-foreground">
            {new Date(envoyeLe!).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
              day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
            })}
          </b>
        </p>
      ) : (
        <>
          <p className="mt-5 text-[13.5px] text-muted-foreground">
            {combien === null ? (
              <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
            ) : combien === 0 ? (
              t.aucun
            ) : (
              <>
                <b className="font-mono text-[15px] tabular-nums text-foreground">{combien}</b>{" "}
                {t.destinataires}
              </>
            )}
          </p>

          <label className="label-mono mt-6 block" htmlFor="mot-merci">{t.votreMot}</label>
          <textarea
            id="mot-merci"
            value={mot}
            maxLength={MAX}
            rows={5}
            placeholder={t.exemple}
            onChange={(e) => setMot(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-[14.5px] leading-relaxed outline-none focus:border-primary"
          />
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {MAX - mot.length} {t.restants}
          </p>

          <label className="label-mono mt-6 block" htmlFor="quand-merci">{t.quand}</label>
          <p className="mt-1 text-[13px] text-muted-foreground">{t.quandAide}</p>
          <input
            id="quand-merci"
            type="datetime-local"
            value={quand}
            onChange={(e) => setQuand(e.target.value)}
            className="mt-2 min-h-[44px] rounded-xl border border-border bg-background px-3 text-[14.5px] outline-none focus:border-primary"
          />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              disabled={occupe || mot.trim().length < 10}
              onClick={() => void enregistrer(true)}
            >
              {occupe && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t.enregistrer}
            </Button>
            {envoiLe && (
              <button
                type="button"
                disabled={occupe}
                onClick={() => void enregistrer(false)}
                className="text-[13.5px] text-muted-foreground underline decoration-border hover:text-foreground"
              >
                {t.annuler}
              </button>
            )}
            {note && <span className="text-[13px] text-muted-foreground">{note}</span>}
          </div>
        </>
      )}
    </section>
  );
};

export default CarteMerci;
