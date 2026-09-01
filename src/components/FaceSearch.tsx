import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* « Retrouvez vos photos ».
 *
 * Trois choses gouvernent cet écran, et aucune n'est négociable :
 *
 *   1. Les deux cases sont décochées au départ. Une case pré-cochée n'est pas
 *      un consentement, c'est une case pré-cochée.
 *   2. L'alternative sans reconnaissance est proposée dans le même écran, au
 *      même niveau. Le RGPD demande qu'elle existe sans pénalité ; le bon sens
 *      demande qu'elle soit visible.
 *   3. Le selfie ne quitte le téléphone que le temps d'une requête. Il n'est
 *      écrit nulle part, et on le dit à la personne au moment où elle le prend.
 */

type Etape = "ferme" | "consentement" | "capture" | "analyse" | "resultats" | "erreur";

const CLE_JETON = "qrm-face-token";

/** Un identifiant aléatoire par navigateur : il remplace un compte. */
function jetonNavigateur(): string {
  try {
    const existant = localStorage.getItem(CLE_JETON);
    if (existant) return existant;
    const neuf = crypto.randomUUID();
    localStorage.setItem(CLE_JETON, neuf);
    return neuf;
  } catch {
    // Navigation privée ou stockage refusé : un jeton de session suffit, la
    // personne ne pourra simplement pas revenir sans refaire un selfie.
    return crypto.randomUUID();
  }
}

/** Réduit le selfie avant l'envoi : 1200 px suffisent largement à Rekognition. */
async function reduire(fichier: File): Promise<string> {
  const image = await createImageBitmap(fichier);
  const cote = 1200;
  const ratio = Math.min(cote / image.width, cote / image.height, 1);
  const toile = document.createElement("canvas");
  toile.width = Math.round(image.width * ratio);
  toile.height = Math.round(image.height * ratio);
  toile.getContext("2d")!.drawImage(image, 0, 0, toile.width, toile.height);
  image.close();
  return toile.toDataURL("image/jpeg", 0.9);
}

const MESSAGES: Record<string, string> = {
  aucun_visage:
    "Nous n'avons pas trouvé de visage sur cette photo. Réessayez avec une photo de face, bien éclairée.",
  plusieurs_visages:
    "Il y a plusieurs personnes sur cette photo. Prenez-en une où vous êtes seul.",
  selfie_illisible:
    "Cette image n'a pas pu être lue. Essayez avec une autre photo.",
  consentement_requis:
    "Il faut accepter l'analyse de votre visage pour lancer la recherche.",
  indisponible:
    "Le tri est momentanément indisponible. Vous pouvez parcourir toute la galerie en attendant.",
};

interface Props {
  eventId: string;
  /** Appelé avec les identifiants des photos trouvées, ou null pour tout voir. */
  onResultats: (photoIds: string[] | null) => void;
}

const FaceSearch = ({ eventId, onResultats }: Props) => {
  const [etape, setEtape] = useState<Etape>("ferme");
  const [prenom, setPrenom] = useState("");
  const [consent, setConsent] = useState(false);
  const [autoriseHotes, setAutoriseHotes] = useState(false);
  const [progression, setProgression] = useState({ faites: 0, total: 0 });
  const [erreur, setErreur] = useState("");
  const [trouvees, setTrouvees] = useState(0);
  const [dejaVenu, setDejaVenu] = useState(false);
  const champFichier = useRef<HTMLInputElement>(null);
  const selfieRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      setDejaVenu(Boolean(localStorage.getItem(CLE_JETON)));
    } catch { /* stockage indisponible : on n'affiche simplement pas l'option */ }
  }, []);

  const chercher = useCallback(async (selfieBase64: string) => {
    setEtape("analyse");
    setErreur("");

    // Tant que l'analyse n'est pas terminée, la fonction serveur rend la main
    // en donnant sa progression. On la rappelle : c'est ce qui permet
    // d'afficher « 340 photos sur 900 » au lieu d'une attente muette.
    for (let tentative = 0; tentative < 120; tentative++) {
      const { data, error } = await supabase.functions.invoke("face-search", {
        body: {
          eventId,
          browserToken: jetonNavigateur(),
          firstName: prenom,
          consent,
          allowHosts: autoriseHotes,
          selfieBase64,
        },
      });

      if (error) {
        setErreur(MESSAGES.indisponible);
        setEtape("erreur");
        return;
      }
      if (data?.status === "analyse_en_cours") {
        setProgression({ faites: data.analysees ?? 0, total: data.total ?? 0 });
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      if (data?.error) {
        setErreur(MESSAGES[data.error] ?? MESSAGES.indisponible);
        setEtape("erreur");
        return;
      }

      selfieRef.current = null; // le selfie ne survit pas à la recherche
      setTrouvees(data?.count ?? 0);
      onResultats(data?.photoIds ?? []);
      setEtape("resultats");
      return;
    }
    setErreur(MESSAGES.indisponible);
    setEtape("erreur");
  }, [eventId, prenom, consent, autoriseHotes, onResultats]);

  const surFichier = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;
    try {
      const reduit = await reduire(fichier);
      selfieRef.current = reduit;
      await chercher(reduit);
    } catch {
      setErreur(MESSAGES.selfie_illisible);
      setEtape("erreur");
    }
  };

  const oublier = async () => {
    await supabase.functions.invoke("face-forget", {
      body: { eventId, browserToken: jetonNavigateur() },
    });
    try { localStorage.removeItem(CLE_JETON); } catch { /* rien à faire */ }
    setDejaVenu(false);
    onResultats(null);
    setEtape("ferme");
  };

  // --- Le bandeau, quand rien n'est ouvert ---------------------------------
  if (etape === "ferme") {
    return (
      <section className="mt-8 border border-border bg-card p-6 sm:p-8">
        <p className="eyebrow">Vos photos</p>
        <h2 className="mt-2 text-[clamp(20px,3.4vw,26px)]">
          Retrouvez les photos où vous apparaissez
        </h2>
        <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
          Prenez-vous en photo, et nous vous montrons celles de la soirée où l'on
          vous voit. Votre photo sert uniquement à cette recherche : elle n'est
          jamais conservée.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setEtape("consentement")}
            className="inline-flex min-h-[48px] items-center border border-primary bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary"
          >
            Retrouver mes photos
          </button>
          {dejaVenu && (
            <button
              type="button"
              onClick={oublier}
              className="label-mono min-h-[48px] border-b border-foreground pb-0.5 text-foreground transition-opacity hover:opacity-60"
            >
              Supprimer mon empreinte
            </button>
          )}
        </div>
      </section>
    );
  }

  // --- Le consentement -----------------------------------------------------
  if (etape === "consentement") {
    return (
      <section className="mt-8 border border-border bg-card p-6 sm:p-8">
        <p className="eyebrow">Avant de commencer</p>
        <h2 className="mt-2 text-[clamp(20px,3.4vw,26px)]">Ce qui va se passer</h2>

        <ul className="mt-5 border-t border-border">
          <li className="border-b border-border py-3 text-[15px] leading-relaxed">
            Votre photo est analysée pour en extraire une empreinte numérique,
            puis <strong>elle est jetée</strong>. Nous ne la conservons pas.
          </li>
          <li className="border-b border-border py-3 text-[15px] leading-relaxed">
            L'empreinte sert à retrouver les photos où vous apparaissez. Elle est
            supprimée au bout de 90 jours, et à tout moment si vous le demandez.
          </li>
          <li className="border-b border-border py-3 text-[15px] leading-relaxed">
            Cette page est réservée aux personnes majeures.
          </li>
        </ul>

        <label className="mt-6 block">
          <span className="label-mono">Votre prénom</span>
          <input
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            maxLength={60}
            placeholder="Camille"
            className="mt-2 block w-full max-w-xs border border-border bg-background px-4 py-3 text-[16px] outline-none focus:border-primary"
          />
        </label>

        <label className="mt-6 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
          />
          <span className="text-[15px] leading-relaxed">
            J'accepte que mon visage soit analysé pour retrouver mes photos.
            <span className="block text-muted-foreground">Nécessaire pour lancer la recherche.</span>
          </span>
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={autoriseHotes}
            onChange={(e) => setAutoriseHotes(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
          />
          <span className="text-[15px] leading-relaxed">
            Les organisateurs peuvent aussi retrouver mes photos pour leur album.
            <span className="block text-muted-foreground">
              Facultatif. Si vous acceptez, votre empreinte est conservée
              jusqu'à la fermeture de la galerie plutôt que 90 jours.
            </span>
          </span>
        </label>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={!consent || !prenom.trim()}
            onClick={() => { setEtape("capture"); champFichier.current?.click(); }}
            className="inline-flex min-h-[48px] items-center border border-primary bg-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground transition-colors hover:bg-transparent hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            Me prendre en photo
          </button>
          <button
            type="button"
            onClick={() => { onResultats(null); setEtape("ferme"); }}
            className="label-mono border-b border-foreground pb-0.5 transition-opacity hover:opacity-60"
          >
            Voir toutes les photos sans reconnaissance
          </button>
        </div>

        <input
          ref={champFichier}
          type="file"
          accept="image/*"
          capture="user"
          onChange={surFichier}
          className="sr-only"
        />
      </section>
    );
  }

  // --- L'attente -----------------------------------------------------------
  if (etape === "analyse" || etape === "capture") {
    const { faites, total } = progression;
    return (
      <section className="mt-8 border border-border bg-card p-6 sm:p-8">
        <p className="eyebrow">Recherche en cours</p>
        <h2 className="mt-2 text-[clamp(20px,3.4vw,26px)]">Un instant</h2>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-muted-foreground">
          {total > 0
            ? `${faites} photos analysées sur ${total}. C'est la première recherche de cette galerie : les suivantes seront immédiates.`
            : "Nous analysons les photos de la soirée."}
        </p>
        {total > 0 && (
          <div className="mt-5 h-[3px] w-full max-w-md bg-secondary">
            <div
              className="h-full bg-primary transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.round((faites / total) * 100))}%` }}
            />
          </div>
        )}
      </section>
    );
  }

  // --- L'erreur ------------------------------------------------------------
  if (etape === "erreur") {
    return (
      <section className="mt-8 border border-border bg-card p-6 sm:p-8">
        <p className="eyebrow">Recherche</p>
        <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed">{erreur}</p>
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={() => setEtape("consentement")}
            className="inline-flex min-h-[48px] items-center border border-primary px-6 py-3 text-xs font-semibold uppercase tracking-[0.1em] transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Réessayer
          </button>
          <button
            type="button"
            onClick={() => { onResultats(null); setEtape("ferme"); }}
            className="label-mono border-b border-foreground pb-0.5 transition-opacity hover:opacity-60"
          >
            Voir toutes les photos
          </button>
        </div>
      </section>
    );
  }

  // --- Les résultats -------------------------------------------------------
  return (
    <section className="mt-8 border border-border bg-card p-6 sm:p-8">
      <p className="eyebrow">Vos photos</p>
      <h2 className="mt-2 text-[clamp(20px,3.4vw,26px)]">
        {trouvees > 0
          ? `${trouvees} ${trouvees > 1 ? "photos" : "photo"} où vous apparaissez`
          : "Aucune photo pour l'instant"}
      </h2>
      {trouvees === 0 && (
        <p className="mt-3 max-w-[54ch] text-[15px] leading-relaxed text-muted-foreground">
          Vos amis n'ont peut-être pas encore déposé les leurs. Revenez dans
          quelques jours : la galerie continue de se remplir.
        </p>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => { onResultats(null); setEtape("ferme"); }}
          className="label-mono border-b border-foreground pb-0.5 transition-opacity hover:opacity-60"
        >
          Revoir toutes les photos
        </button>
        <button
          type="button"
          onClick={oublier}
          className="label-mono border-b border-foreground pb-0.5 text-muted-foreground transition-opacity hover:opacity-60"
        >
          Supprimer mon empreinte
        </button>
      </div>
    </section>
  );
};

export default FaceSearch;
