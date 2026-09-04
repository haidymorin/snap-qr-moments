import { useRef, type ReactNode } from "react";

/* Une carte posée sur un halo qui suit le pointeur.
 *
 * Réservée aux formules et à ce qui parle du tri : c'est là qu'on vend
 * l'intelligence du produit, et c'est le seul endroit où une couleur de marque
 * a une raison d'être. Étalée sur tout un site, elle ferait ressembler
 * QR Memories à n'importe quel outil.
 *
 * Le halo vit derrière la carte, jamais dessous le texte : le contenu reste
 * sur un fond plein et donc lisible, quelle que soit la couleur.
 */

interface Props {
  children: ReactNode;
  className?: string;
}

const CarteLueur = ({ children, className = "" }: Props) => {
  const boite = useRef<HTMLDivElement>(null);

  /* On écrit la position du pointeur dans deux variables CSS et c'est la
     feuille de style qui s'en sert. Aucun rendu React n'est déclenché : sur un
     survol, redessiner le composant à chaque pixel serait ridicule. */
  const suivre = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = boite.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const oublier = () => {
    const el = boite.current;
    if (!el) return;
    el.style.removeProperty("--mx");
    el.style.removeProperty("--my");
  };

  return (
    <div
      ref={boite}
      onPointerMove={suivre}
      onPointerLeave={oublier}
      className={`carte-lueur transition-transform duration-500 ease-out hover:-translate-y-1.5 motion-reduce:transform-none motion-reduce:transition-none ${className}`}
    >
      {children}
    </div>
  );
};

export default CarteLueur;
