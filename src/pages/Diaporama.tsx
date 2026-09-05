import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* Le diaporama de salle.
 *
 * Une page qu'on ouvre sur l'ordinateur relié à l'écran, puis qu'on oublie.
 * Tout est pensé pour ça : aucun mot de passe à taper devant deux cents
 * invités, aucun bouton à cliquer pendant la soirée, et rien qui s'arrête si
 * le réseau de la salle tousse pendant deux minutes.
 *
 * Ce qu'il ne fait pas, volontairement :
 *
 *   · pas de son. Le micro du DJ et la playlist occupent déjà la salle ; un
 *     message vocal projeté par-dessus ne serait entendu par personne et
 *     couperait la musique. Les vocaux restent dans la galerie.
 *   · pas de transition acrobatique. Un fondu et une lente dérive suffisent —
 *     ce que les gens regardent, c'est la photo de leur cousin, pas l'effet.
 *   · pas de vidéo. Une vidéo dure, et pendant ce temps le mur ne montre plus
 *     rien d'autre.
 */

interface Item {
  genre: "photo" | "message";
  id: string;
  url: string | null;
  apercu: string | null;
  media_type: string | null;
  auteur: string | null;
  texte: string | null;
  cree_le: string;
}

const DUREE_PHOTO = 7000;
const DUREE_MESSAGE = 9000;
const RAFRAICHIR = 25_000;

const Diaporama = () => {
  const { id } = useParams();
  const [params] = useSearchParams();
  const jeton = params.get("jeton") ?? "";

  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [panne, setPanne] = useState<string | null>(null);
  const [pret, setPret] = useState(false);
  const [barre, setBarre] = useState(true);

  /* Les identifiants déjà vus. Une photo qui arrive pendant la soirée doit
     passer bientôt, pas attendre un tour complet de quatre cents images. */
  const vus = useRef<Set<string>>(new Set());

  const charger = useCallback(async () => {
    if (!id || !jeton) { setPanne("lien"); setPret(true); return; }
    const { data, error } = await supabase.rpc("diaporama_flux", {
      p_event: id, p_jeton: jeton, p_limite: 120,
    });
    if (error) {
      /* On ne vide pas l'écran sur une erreur réseau : la salle continue de
         voir les photos déjà chargées, et le prochain appel réessaiera. */
      if (items.length === 0) setPanne("acces");
      setPret(true);
      return;
    }
    const rows = (data ?? []) as Item[];
    setPanne(null);
    setPret(true);
    setItems((anciens) => {
      const connus = new Set(anciens.map((a) => a.id));
      const nouveaux = rows.filter((r) => !connus.has(r.id));
      /* Les nouveautés passent devant, juste après l'image en cours. */
      if (anciens.length === 0) return rows;
      if (nouveaux.length === 0) return anciens;
      return [...anciens.slice(0, index + 1), ...nouveaux, ...anciens.slice(index + 1)];
    });
  }, [id, jeton, index, items.length]);

  useEffect(() => { charger(); }, [id, jeton]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = window.setInterval(charger, RAFRAICHIR);
    return () => window.clearInterval(t);
  }, [charger]);

  const courant = items.length ? items[index % items.length] : null;

  useEffect(() => {
    if (!courant) return;
    vus.current.add(courant.id);
    const duree = courant.genre === "message" ? DUREE_MESSAGE : DUREE_PHOTO;
    const t = window.setTimeout(() => setIndex((i) => (items.length ? (i + 1) % items.length : 0)), duree);
    return () => window.clearTimeout(t);
  }, [courant, items.length]);

  /* La barre du haut disparaît au bout de cinq secondes et revient au moindre
     mouvement de souris : on ne veut pas d'interface projetée toute la nuit,
     mais on veut pouvoir passer en plein écran sans deviner où cliquer. */
  useEffect(() => {
    let t = window.setTimeout(() => setBarre(false), 5000);
    const reveiller = () => {
      setBarre(true);
      window.clearTimeout(t);
      t = window.setTimeout(() => setBarre(false), 4000);
    };
    window.addEventListener("mousemove", reveiller);
    window.addEventListener("keydown", reveiller);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousemove", reveiller);
      window.removeEventListener("keydown", reveiller);
    };
  }, []);

  const pleinEcran = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  const precedentes = useMemo(
    () => items.filter((i) => i.genre === "photo" && i.apercu).slice(0, 14),
    [items],
  );

  if (!pret) return <div className="min-h-screen bg-black" />;

  if (panne) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-black px-8 text-center text-white/80">
        <p className="text-2xl">Ce diaporama n'est pas accessible.</p>
        <p className="max-w-[52ch] text-white/50">
          {panne === "lien"
            ? "Le lien est incomplet. Recopiez-le depuis votre tableau de bord."
            : "Le lien a peut-être été régénéré, ou l'hébergement de cet événement est terminé. Le diaporama est compris dans la formule Souvenir."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <style>{`
        @keyframes diapo-entree { from { opacity: 0 } to { opacity: 1 } }
        @keyframes diapo-derive {
          from { transform: scale(1.04) translate3d(0,0,0); }
          to   { transform: scale(1.12) translate3d(-1.6%,-1.2%,0); }
        }
      `}</style>

      {!courant && (
        <div className="flex min-h-screen items-center justify-center px-10 text-center">
          <div>
            <p className="text-3xl text-white/85">Les premières photos vont arriver.</p>
            <p className="mt-3 text-white/45">
              Cet écran se remplit tout seul, au fur et à mesure des dépôts de vos invités.
            </p>
          </div>
        </div>
      )}

      {courant?.genre === "photo" && courant.url && (
        <div key={courant.id} className="absolute inset-0" style={{ animation: "diapo-entree 1s ease" }}>
          {/* Le fond flou évite les deux bandes noires d'une photo verticale
              projetée sur un écran horizontal. */}
          <div
            aria-hidden
            className="absolute inset-0 scale-110 blur-3xl brightness-[0.35]"
            style={{ background: `center / cover no-repeat url("${courant.apercu ?? courant.url}")` }}
          />
          <img
            src={courant.url}
            alt=""
            className="absolute inset-0 m-auto max-h-[92vh] max-w-[94vw] object-contain"
            style={{ animation: "diapo-derive 9s ease-out forwards" }}
          />
        </div>
      )}

      {courant?.genre === "message" && (
        <div
          key={courant.id}
          className="flex min-h-screen items-center justify-center px-[8vw] text-center"
          style={{ animation: "diapo-entree 1s ease" }}
        >
          <figure className="m-0 max-w-[24ch]">
            <div className="font-display text-[10vw] leading-[0.4] text-white/25">&ldquo;</div>
            <blockquote className="m-0 mt-6 font-display text-[clamp(30px,4.6vw,72px)] italic leading-[1.28]">
              {courant.texte}
            </blockquote>
            <figcaption className="mt-10 text-[clamp(15px,1.5vw,22px)] uppercase tracking-[0.2em] text-white/55">
              {courant.auteur}
            </figcaption>
          </figure>
        </div>
      )}

      {/* La frise des dernières arrivées : elle dit à la salle que l'écran est
          vivant, et donne envie de voir passer la sienne. */}
      {precedentes.length > 3 && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex gap-1 bg-gradient-to-t from-black/70 to-transparent p-3">
          {precedentes.map((p) => (
            <span
              key={p.id}
              className="h-[7vh] flex-1 rounded-md opacity-60"
              style={{ background: `center / cover no-repeat url("${p.apercu}")` }}
            />
          ))}
        </div>
      )}

      <div
        className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 py-4 transition-opacity duration-500"
        style={{ opacity: barre ? 1 : 0 }}
      >
        <span className="text-[13px] uppercase tracking-[0.18em] text-white/45">QR Memories</span>
        <button
          type="button"
          onClick={pleinEcran}
          className="rounded-full border border-white/30 px-4 py-2 text-[13px] text-white/70 transition-colors hover:border-white hover:text-white"
        >
          Plein écran
        </button>
      </div>
    </div>
  );
};

export default Diaporama;
