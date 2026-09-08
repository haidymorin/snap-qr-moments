import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { cleInvite, lirePrenom, noterPrenom } from "@/lib/invite";
import { Loader2, Check, Camera } from "lucide-react";

/* Le jeu, côté invité.
 *
 * Une liste de défis, un appareil photo par défi. On appuie, on photographie,
 * le défi se coche. C'est tout, et c'est délibéré : chaque écran de plus entre
 * l'envie et la photo coûte des participants, et un invité debout avec un
 * verre ne lit pas d'explication.
 *
 * Le prénom est demandé une seule fois, à la première photo, et seulement
 * parce qu'un classement anonyme ne fait rire personne. Il est facultatif :
 * qui ne le donne pas apparaît sous « Un invité » et marque ses points quand
 * même.
 */

interface Defi {
  defi_id: string;
  ordre: number;
  texte: string;
  releve: boolean;
  releves_total: number;
  actif: boolean;
  modele: string;
  lot: string | null;
}

const T: Record<Lang, Record<string, string>> = {
  fr: {
    titreChasse: "La chasse au trésor",
    titreBingo: "Le bingo photo",
    titreObjectif: "Dix avant le dessert",
    sous: "Photographiez, le défi se coche. Vos photos rejoignent la galerie comme les autres.",
    lot: "À gagner",
    votreScore: "Vos défis relevés",
    fait: "Fait",
    prendre: "Photographier",
    envoi: "Envoi…",
    prenomTitre: "Votre prénom, pour le classement",
    prenomAide: "Facultatif. Sans lui, vous apparaissez sous « Un invité ».",
    prenomValider: "C'est parti",
    prenomPasser: "Jouer sans donner mon prénom",
    classement: "Le classement",
    points: "défis",
    bingoGagne: "Ligne complète, vous avez gagné le bingo.",
    objectifFini: "Objectif atteint. Rien ne vous empêche de continuer.",
    echec: "L'envoi n'a pas abouti. Réessayez dans un instant.",
  },
  en: {
    titreChasse: "The treasure hunt",
    titreBingo: "Photo bingo",
    titreObjectif: "Ten before dessert",
    sous: "Take the photo, the challenge is ticked off. Your photos join the gallery like any other.",
    lot: "The prize",
    votreScore: "Challenges you have taken on",
    fait: "Done",
    prendre: "Take the photo",
    envoi: "Sending…",
    prenomTitre: "Your first name, for the leaderboard",
    prenomAide: "Optional. Without it you appear as “A guest”.",
    prenomValider: "Let's go",
    prenomPasser: "Play without giving my name",
    classement: "The leaderboard",
    points: "challenges",
    bingoGagne: "A full line — you have won the bingo.",
    objectifFini: "Target reached. Nothing stops you from carrying on.",
    echec: "The upload did not go through. Try again in a moment.",
  },
};

interface Props {
  eventId: string;
  /** Envoie la photo, l'enregistre, et rend son identifiant. */
  envoyer: (fichier: File) => Promise<string | null>;
  onPhotoEnvoyee?: () => void;
}

const JeuInvite = ({ eventId, envoyer, onPhotoEnvoyee }: Props) => {
  const { lang } = useLanguage();
  const t = T[lang];
  const invite = useMemo(() => cleInvite(eventId), [eventId]);

  const [defis, setDefis] = useState<Defi[]>([]);
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState<string | null>(null);
  const [panne, setPanne] = useState(false);
  const [prenom, setPrenom] = useState(() => lirePrenom(eventId));
  const [demandePrenom, setDemandePrenom] = useState(false);
  const [classement, setClassement] = useState<{ prenom: string; points: number }[]>([]);
  const enAttente = useRef<{ defi: string; fichier: File } | null>(null);

  const charger = useCallback(async () => {
    const { data } = await supabase.rpc("guest_jeu", { p_event: eventId, p_invite: invite });
    setDefis((data ?? []) as Defi[]);
    setChargement(false);
    const { data: cl } = await supabase.rpc("jeu_classement", { p_event: eventId, p_limite: 8 });
    setClassement((cl ?? []) as { prenom: string; points: number }[]);
  }, [eventId, invite]);

  useEffect(() => { charger(); }, [charger]);

  const relever = async (defiId: string, fichier: File) => {
    setOccupe(defiId);
    setPanne(false);
    try {
      const photoId = await envoyer(fichier);
      await supabase.rpc("relever_defi", {
        p_event: eventId, p_defi: defiId, p_photo: photoId,
        p_invite: invite, p_prenom: prenom || null,
      });
      onPhotoEnvoyee?.();
      await charger();
    } catch {
      setPanne(true);
    }
    setOccupe(null);
  };

  /* Le prénom est réclamé au premier défi seulement, et la photo choisie
     attend pendant ce temps : redemander de sélectionner l'image après avoir
     tapé son prénom ferait abandonner la moitié des gens. */
  const choisir = (defiId: string, fichier: File | undefined) => {
    if (!fichier) return;
    if (!prenom && !lirePrenom(eventId)) {
      enAttente.current = { defi: defiId, fichier };
      setDemandePrenom(true);
      return;
    }
    void relever(defiId, fichier);
  };

  const confirmerPrenom = (avecPrenom: boolean) => {
    if (avecPrenom && prenom.trim()) noterPrenom(eventId, prenom);
    setDemandePrenom(false);
    const a = enAttente.current;
    enAttente.current = null;
    if (a) void relever(a.defi, a.fichier);
  };

  if (chargement) {
    return <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-muted-foreground" />;
  }
  if (defis.length === 0) return null;

  const modele = defis[0].modele;
  const lot = defis[0].lot;
  const releves = defis.filter((d) => d.releve).length;
  const titre = modele === "bingo" ? t.titreBingo : modele === "objectif" ? t.titreObjectif : t.titreChasse;

  /* Le bingo se joue sur une grille carrée : la racine du nombre de défis
     donne le côté, et seize cases font quatre par quatre. */
  const cote = Math.round(Math.sqrt(defis.length));
  const grille = modele === "bingo" && cote * cote === defis.length;

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl">{titre}</h2>
          <p className="mt-2 max-w-[54ch] text-[14.5px] leading-relaxed text-muted-foreground">
            {t.sous}
          </p>
        </div>
        <div className="text-right">
          <span className="label-mono block">{t.votreScore}</span>
          <span className="font-display text-[34px] leading-none">
            {releves}<span className="text-muted-foreground">/{defis.length}</span>
          </span>
        </div>
      </div>

      {modele === "objectif" && (
        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-700"
            style={{ width: `${Math.round((releves / defis.length) * 100)}%` }}
          />
        </div>
      )}

      {lot && (
        <p className="mt-5 rounded-xl border border-accent bg-card px-4 py-3 text-[14px] text-foreground">
          <b>{t.lot} : </b>{lot}
        </p>
      )}

      {releves === defis.length && modele === "objectif" && (
        <p className="mt-4 text-[14px] text-accent">{t.objectifFini}</p>
      )}
      {panne && <p className="mt-4 text-[14px] text-destructive">{t.echec}</p>}

      <div
        className={`mt-6 grid gap-2 ${
          grille ? "grid-cols-2 sm:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {defis.map((d) => (
          <label
            key={d.defi_id}
            className={`flex cursor-pointer flex-col justify-between gap-3 rounded-2xl border p-4 transition-colors ${
              d.releve
                ? "border-primary bg-secondary"
                : "border-border bg-card hover:border-primary"
            } ${grille ? "aspect-square text-center" : ""}`}
          >
            <span className={`text-[14px] leading-snug text-foreground ${grille ? "flex-1 place-content-center" : ""}`}>
              {d.texte}
            </span>

            {d.releve ? (
              <span className="label-mono inline-flex items-center gap-1.5 text-primary opacity-100">
                <Check className="h-3.5 w-3.5" /> {t.fait}
              </span>
            ) : (
              <span className="label-mono inline-flex items-center gap-1.5 text-foreground opacity-100">
                {occupe === d.defi_id ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t.envoi}</>
                ) : (
                  <><Camera className="h-3.5 w-3.5" /> {t.prendre}</>
                )}
              </span>
            )}

            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={d.releve || occupe !== null}
              onChange={(e) => {
                choisir(d.defi_id, e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
          </label>
        ))}
      </div>

      {classement.length > 1 && (
        <div className="mt-10">
          <h3 className="text-xl">{t.classement}</h3>
          <ol className="mt-4 border-t border-border">
            {classement.map((c, i) => (
              <li key={`${c.prenom}-${i}`} className="flex items-baseline justify-between gap-4 border-b border-border py-3">
                <span className="flex items-baseline gap-3">
                  <span className="label-mono w-6 text-muted-foreground">{i + 1}</span>
                  <span className="text-[15px] text-foreground">{c.prenom}</span>
                </span>
                <span className="font-mono text-[15px] tabular-nums text-muted-foreground">
                  {c.points} {t.points}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {demandePrenom && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-[420px] rounded-2xl border border-border bg-background p-6">
            <h3 className="text-[19px] text-foreground">{t.prenomTitre}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{t.prenomAide}</p>
            <input
              autoFocus
              value={prenom}
              maxLength={40}
              onChange={(e) => setPrenom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmerPrenom(true); }}
              className="mt-4 min-h-[48px] w-full rounded-xl border border-border bg-card px-4 text-[15px] outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => confirmerPrenom(true)}
              className="mt-4 inline-flex min-h-[48px] w-full items-center justify-center rounded-full border border-primary bg-primary px-6 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground"
            >
              {t.prenomValider}
            </button>
            <button
              type="button"
              onClick={() => confirmerPrenom(false)}
              className="label-mono mt-3 w-full text-center hover:text-foreground"
            >
              {t.prenomPasser}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default JeuInvite;
