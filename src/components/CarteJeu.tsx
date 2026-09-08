import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, Lang } from "@/contexts/LanguageContext";
import { MODELES, defisProposes, type ModeleJeu } from "@/data/jeux";
import { Loader2, Plus, X } from "lucide-react";

/* Le jeu, côté mariés.
 *
 * Choisir un modèle, relire les défis, écrire le lot, allumer. Les défis
 * arrivent déjà écrits — c'est le point important : demander à quelqu'un qui
 * prépare un mariage d'inventer douze défis à trois semaines de la date, c'est
 * garantir que le jeu ne sera jamais allumé.
 *
 * Les défis se remplacent en bloc et le serveur refuse dès qu'un invité a
 * commencé à jouer. Changer les règles en cours de soirée effacerait les
 * points de ceux qui ont déjà joué, ce qui est pire que de ne pas pouvoir les
 * changer.
 */

const T: Record<Lang, Record<string, string>> = {
  fr: {
    titre: "Le jeu photo",
    chapo: "Une liste de défis à relever pendant la soirée. C'est ce qui fait passer un mariage de deux cents photos à neuf cents : un invité qui a une liste photographie des choses auxquelles il n'aurait jamais pensé.",
    choisir: "Choisissez un modèle",
    lot: "Ce qu'il y a à gagner",
    lotAide: "Facultatif, et ça n'a pas à être cher. « La première part de gâteau » fonctionne mieux qu'un bon d'achat.",
    lotExemple: "La première part de gâteau",
    defis: "Les défis",
    defisAide: "Relisez-les, modifiez ce qui ne vous ressemble pas, supprimez ce qui ne va pas. Ils s'afficheront tels quels sur le téléphone de vos invités.",
    ajouter: "Ajouter un défi",
    reinitialiser: "Reprendre les défis proposés",
    allumer: "Activer le jeu",
    eteindre: "Désactiver le jeu",
    actif: "Le jeu est actif",
    inactif: "Le jeu n'est pas actif",
    enregistrer: "Enregistrer",
    enregistre: "Enregistré.",
    commence: "Des invités ont déjà relevé des défis : la liste ne peut plus être modifiée. Vous pouvez encore changer le lot ou éteindre le jeu.",
    erreur: "L'enregistrement a échoué.",
  },
  en: {
    titre: "The photo game",
    chapo: "A list of challenges to take on during the night. This is what takes a wedding from two hundred photos to nine hundred: a guest with a list photographs things they would never have thought of.",
    choisir: "Pick a template",
    lot: "What there is to win",
    lotAide: "Optional, and it does not have to be expensive. “The first slice of cake” works better than a gift card.",
    lotExemple: "The first slice of cake",
    defis: "The challenges",
    defisAide: "Read them through, change what does not sound like you, delete what does not fit. They will appear exactly like this on your guests' phones.",
    ajouter: "Add a challenge",
    reinitialiser: "Restore the suggested challenges",
    allumer: "Turn the game on",
    eteindre: "Turn the game off",
    actif: "The game is on",
    inactif: "The game is off",
    enregistrer: "Save",
    enregistre: "Saved.",
    commence: "Guests have already taken on challenges: the list can no longer be changed. You can still change the prize or turn the game off.",
    erreur: "Saving failed.",
  },
};

interface Props {
  eventId: string;
  eventType: string;
  actif: boolean;
  modele: string;
  lot: string | null;
  onChange?: (v: { jeu_actif: boolean; jeu_modele: string; jeu_lot: string | null }) => void;
}

const CarteJeu = ({ eventId, eventType, actif: actifInitial, modele: modeleInitial, lot: lotInitial, onChange }: Props) => {
  const { lang } = useLanguage();
  const t = T[lang];

  const [actif, setActif] = useState(actifInitial);
  const [modele, setModele] = useState<ModeleJeu>((modeleInitial as ModeleJeu) ?? "chasse");
  const [lot, setLot] = useState(lotInitial ?? "");
  const [defis, setDefis] = useState<string[]>([]);
  const [verrouille, setVerrouille] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [fait, setFait] = useState(false);
  const [panne, setPanne] = useState(false);

  /* On repart de ce qui est en base quand des défis existent déjà, et des
     propositions du modèle sinon. */
  const charger = useCallback(async () => {
    const { data } = await supabase.rpc("hote_defis", { p_event: eventId });
    const lignes = (data ?? []) as { texte: string; releves: number }[];
    if (lignes.length > 0) {
      setDefis(lignes.map((l) => l.texte));
      setVerrouille(lignes.some((l) => Number(l.releves) > 0));
    } else {
      setDefis(defisProposes(lang, (modeleInitial as ModeleJeu) ?? "chasse", eventType));
    }
  }, [eventId, eventType, lang, modeleInitial]);

  useEffect(() => { charger(); }, [charger]);

  const changerModele = (m: ModeleJeu) => {
    setModele(m);
    if (!verrouille) setDefis(defisProposes(lang, m, eventType));
  };

  const enregistrer = async (nouvelEtat = actif) => {
    setOccupe(true);
    setPanne(false);
    setFait(false);
    const { error } = await supabase.rpc("regler_jeu", {
      p_event: eventId,
      p_actif: nouvelEtat,
      p_modele: modele,
      p_lot: lot.trim() || null,
      p_defis: verrouille ? null : defis.filter((d) => d.trim().length >= 3),
    });
    setOccupe(false);
    if (error) { setPanne(true); return; }
    setActif(nouvelEtat);
    setFait(true);
    onChange?.({ jeu_actif: nouvelEtat, jeu_modele: modele, jeu_lot: lot.trim() || null });
    window.setTimeout(() => setFait(false), 2500);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[18px] font-semibold text-foreground">{t.titre}</h3>
        <span className={`label-mono rounded-full border px-3 py-1 opacity-100 ${
          actif ? "border-primary text-primary" : "border-border text-muted-foreground"
        }`}>
          {actif ? t.actif : t.inactif}
        </span>
      </div>
      <p className="mt-2 max-w-[64ch] text-[14px] leading-relaxed text-muted-foreground">{t.chapo}</p>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-[13.5px] font-semibold text-foreground">{t.choisir}</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {MODELES[lang].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => changerModele(m.id)}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                modele === m.id ? "border-primary bg-secondary" : "border-border hover:border-primary"
              }`}
            >
              <span className="block text-[15px] font-semibold text-foreground">{m.nom}</span>
              <span className="mt-1 block text-[13px] text-accent">{m.promesse}</span>
              <span className="mt-2 block text-[12.5px] leading-relaxed text-muted-foreground">
                {m.comment}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <label htmlFor="lot" className="block text-[13.5px] font-semibold text-foreground">{t.lot}</label>
        <p className="mt-1 max-w-[60ch] text-[12.5px] leading-relaxed text-muted-foreground">{t.lotAide}</p>
        <input
          id="lot" value={lot} maxLength={80} placeholder={t.lotExemple}
          onChange={(e) => setLot(e.target.value)}
          className="mt-2 min-h-[42px] w-full max-w-[420px] rounded-xl border border-border bg-background px-3 text-[14px] outline-none focus:border-primary"
        />
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <p className="text-[13.5px] font-semibold text-foreground">{t.defis}</p>
        <p className="mt-1 max-w-[62ch] text-[12.5px] leading-relaxed text-muted-foreground">
          {verrouille ? t.commence : t.defisAide}
        </p>

        <ul className="mt-3 space-y-2">
          {defis.map((d, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="label-mono w-6 shrink-0 text-muted-foreground">{i + 1}</span>
              <input
                value={d}
                maxLength={140}
                disabled={verrouille}
                onChange={(e) =>
                  setDefis((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
                }
                className="min-h-[40px] flex-1 rounded-xl border border-border bg-background px-3 text-[14px] outline-none focus:border-primary disabled:opacity-60"
              />
              {!verrouille && (
                <button
                  type="button"
                  aria-label="Retirer"
                  onClick={() => setDefis((prev) => prev.filter((_, j) => j !== i))}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {!verrouille && (
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDefis((prev) => [...prev, ""])}
              disabled={defis.length >= 24}
              className="label-mono inline-flex min-h-[40px] items-center gap-2 rounded-full border border-border px-4 transition-colors hover:border-primary disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" /> {t.ajouter}
            </button>
            <button
              type="button"
              onClick={() => setDefis(defisProposes(lang, modele, eventType))}
              className="label-mono min-h-[40px] hover:text-foreground"
            >
              {t.reinitialiser}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => enregistrer(!actif)}
          disabled={occupe}
          className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors disabled:opacity-60 ${
            actif
              ? "border-border text-foreground hover:border-destructive hover:text-destructive"
              : "border-primary bg-primary text-primary-foreground hover:bg-transparent hover:text-primary"
          }`}
        >
          {occupe && <Loader2 className="h-4 w-4 animate-spin" />}
          {actif ? t.eteindre : t.allumer}
        </button>
        <button
          type="button"
          onClick={() => enregistrer(actif)}
          disabled={occupe}
          className="label-mono min-h-[44px] rounded-full border border-border px-5 transition-colors hover:border-primary disabled:opacity-60"
        >
          {t.enregistrer}
        </button>
        {fait && <span className="label-mono text-accent">{t.enregistre}</span>}
        {panne && <span className="label-mono text-destructive">{t.erreur}</span>}
      </div>
    </div>
  );
};

export default CarteJeu;
