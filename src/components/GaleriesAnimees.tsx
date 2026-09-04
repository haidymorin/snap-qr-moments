import { useEffect, useMemo, useRef, useState } from "react";
import { photo } from "@/lib/photos";

/* Deux galeries en mouvement pour la page d'accueil.
 *
 * Le produit sert à regarder des photos : une page qui n'en montre qu'une à la
 * fois raconte le contraire de ce qu'elle vend. Ces deux blocs en montrent
 * beaucoup, et les font bouger.
 *
 * Aucune bibliothèque : tout tient en quelques transformations CSS et une
 * boucle d'animation. Ajouter trois cents kilo-octets de moteur d'animation
 * pour faire glisser des images serait payé par l'invité qui charge la page
 * sur le réseau d'une salle de réception.
 */

const bougeMoinsPossible = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ────────────────────────────────────────────────────────────
   Le ruban : deux rangées qui glissent en sens contraire.
   ──────────────────────────────────────────────────────────── */

interface RubanProps {
  /** Décalage de départ dans la banque d'images, pour ne pas répéter le mur. */
  depart?: number;
}

export function RubanPhotos({ depart = 40 }: RubanProps) {
  const [calme] = useState(bougeMoinsPossible);

  /* Chaque rangée est écrite deux fois bout à bout : quand la première moitié
     a fini de défiler, la seconde est exactement à sa place et la boucle ne se
     voit pas. */
  const rangees = useMemo(
    () =>
      [0, 1].map((r) => {
        const base = Array.from({ length: 10 }, (_, i) => depart + r * 10 + i);
        return [...base, ...base];
      }),
    [depart],
  );

  return (
    <section aria-hidden className="overflow-hidden border-y border-border bg-paper py-3">
      {rangees.map((ids, r) => (
        <div key={r} className="flex w-max gap-2 py-1.5" data-ruban={r}>
          {ids.map((n, i) => (
            <figure
              key={`${r}-${i}`}
              className="m-0 h-[clamp(88px,13vw,164px)] w-[clamp(120px,18vw,232px)] shrink-0 overflow-hidden bg-secondary"
              style={
                calme
                  ? undefined
                  : {
                      animation: `ruban-${r === 0 ? "gauche" : "droite"} ${r === 0 ? 58 : 74}s linear infinite`,
                    }
              }
            >
              <img
                src={photo(n, 420)}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
                onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
              />
            </figure>
          ))}
        </div>
      ))}

      <style>{`
        @keyframes ruban-gauche  { from { transform: translate3d(0,0,0); }
                                   to   { transform: translate3d(-100%,0,0); } }
        @keyframes ruban-droite  { from { transform: translate3d(-100%,0,0); }
                                   to   { transform: translate3d(0,0,0); } }
      `}</style>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
   Le carrousel à inertie.

   Les photos sont posées sur un arc. On les lance au doigt ou à la souris, et
   elles ralentissent toutes seules — le geste est celui d'un jeu de cartes
   qu'on étale sur une table. Au repos, l'arc dérive très lentement pour que la
   section ne paraisse jamais figée.
   ──────────────────────────────────────────────────────────── */

interface CarrouselProps {
  /** Décalage de départ dans la banque d'images. */
  depart?: number;
  nombre?: number;
}

const FROTTEMENT = 0.94;
const DERIVE = 0.0016;

export function CarrouselInertie({ depart = 62, nombre = 12 }: CarrouselProps) {
  const boite = useRef<HTMLDivElement>(null);
  const decalage = useRef(0);
  const vitesse = useRef(0);
  const attrape = useRef<{ actif: boolean; x: number } | null>(null);
  const [, redessine] = useState(0);
  const [calme] = useState(bougeMoinsPossible);

  const cartes = useMemo(
    () => Array.from({ length: nombre }, (_, i) => depart + i),
    [depart, nombre],
  );

  useEffect(() => {
    if (calme) return;
    let vivant = true;

    const tour = () => {
      if (!vivant) return;
      if (!attrape.current?.actif) {
        decalage.current += vitesse.current + DERIVE;
        vitesse.current *= FROTTEMENT;
        if (Math.abs(vitesse.current) < 0.00005) vitesse.current = 0;
      }
      redessine((n) => (n + 1) % 1000);
      requestAnimationFrame(tour);
    };

    const id = requestAnimationFrame(tour);
    return () => { vivant = false; cancelAnimationFrame(id); };
  }, [calme]);

  /* Un pointeur, trois gestes : on attrape, on tire, on lâche. Le mouvement
     horizontal est converti en tours de carrousel, la vitesse du dernier
     déplacement devient l'élan. */
  const largeurCarte = () => Math.max(180, (boite.current?.clientWidth ?? 900) / 4.2);

  const prendre = (x: number) => { attrape.current = { actif: true, x }; vitesse.current = 0; };
  const tirer = (x: number) => {
    if (!attrape.current?.actif) return;
    const d = (x - attrape.current.x) / largeurCarte();
    attrape.current.x = x;
    decalage.current -= d;
    vitesse.current = -d;
  };
  const lacher = () => { if (attrape.current) attrape.current.actif = false; };

  const n = cartes.length;
  const espacement = largeurCarte();

  return (
    <div
      ref={boite}
      className="relative h-[clamp(240px,34vw,400px)] cursor-grab touch-pan-y select-none overflow-hidden active:cursor-grabbing"
      onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); prendre(e.clientX); }}
      onPointerMove={(e) => tirer(e.clientX)}
      onPointerUp={lacher}
      onPointerCancel={lacher}
      onPointerLeave={lacher}
    >
      {cartes.map((source, i) => {
        /* Position relative au centre, ramenée dans l'intervalle [-n/2, n/2[ :
           une carte qui sort à droite réapparaît à gauche sans saut. */
        let p = i - decalage.current;
        p = ((p % n) + n + n / 2) % n - n / 2;

        const x = p * espacement;
        const y = Math.abs(p) * Math.abs(p) * 7;
        const rotation = -p * 3.2;
        const echelle = Math.max(0.72, 1 - Math.abs(p) * 0.07);
        const opacite = Math.max(0, 1 - Math.abs(p) * 0.22);

        return (
          <figure
            key={source}
            aria-hidden
            className="absolute left-1/2 top-1/2 m-0 overflow-hidden bg-secondary shadow-none"
            style={{
              width: espacement * 0.82,
              height: espacement * 1.06,
              transform: `translate3d(calc(-50% + ${x}px), calc(-50% + ${y}px), 0) rotate(${rotation}deg) scale(${echelle})`,
              opacity: opacite,
              zIndex: 100 - Math.round(Math.abs(p) * 10),
              willChange: "transform",
            }}
          >
            <img
              src={photo(source, 640)}
              alt=""
              draggable={false}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
              onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
            />
          </figure>
        );
      })}
    </div>
  );
}
