import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, X } from "lucide-react";

/* Le bandeau, côté invité.
 *
 * Il interroge le serveur toutes les vingt secondes. C'est grossier, et c'est
 * exactement ce qu'il faut : une connexion temps réel ouverte pendant six
 * heures sur cent vingt téléphones dans une salle au réseau saturé coûte plus
 * qu'elle ne rapporte, pour un message qui arrive deux ou trois fois dans la
 * soirée.
 *
 * La fermeture est mémorisée sur la date du message, pas sur son texte : un
 * nouveau message réaffiche donc le bandeau, même si les mariés répètent le
 * même mot. Et si le stockage local est refusé, le bandeau réapparaît — c'est
 * le bon sens du moindre mal : mieux vaut un bandeau de trop qu'un invité qui
 * rate la photo de groupe.
 */

const CLE = (eventId: string) => `qrm-annonce-${eventId}`;
const INTERVALLE = 20_000;

interface Props {
  eventId: string;
}

const BandeauAnnonce = ({ eventId }: Props) => {
  const [texte, setTexte] = useState<string | null>(null);
  const [depuis, setDepuis] = useState<string | null>(null);
  const ferme = useRef<string | null>(null);

  useEffect(() => {
    try {
      ferme.current = localStorage.getItem(CLE(eventId));
    } catch {
      ferme.current = null;
    }

    let vivant = true;

    const lire = async () => {
      const { data } = await supabase.rpc("guest_annonce", { p_event_id: eventId });
      if (!vivant) return;
      const ligne = (data as { texte: string; depuis: string }[] | null)?.[0];
      if (!ligne || !ligne.texte) {
        setTexte(null);
        return;
      }
      if (ferme.current === ligne.depuis) {
        setTexte(null);
        return;
      }
      setTexte(ligne.texte);
      setDepuis(ligne.depuis);
    };

    void lire();
    const minuteur = setInterval(() => void lire(), INTERVALLE);
    return () => {
      vivant = false;
      clearInterval(minuteur);
    };
  }, [eventId]);

  if (!texte) return null;

  const fermer = () => {
    if (depuis) {
      ferme.current = depuis;
      try {
        localStorage.setItem(CLE(eventId), depuis);
      } catch {
        /* Navigation privée : le bandeau réapparaîtra, ce n'est pas grave. */
      }
    }
    setTexte(null);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 border-b border-primary/30 bg-primary text-primary-foreground"
    >
      <div className="mx-auto flex max-w-3xl items-start gap-3 px-4 py-3">
        <Megaphone className="mt-[2px] h-5 w-5 shrink-0" />
        <p className="flex-1 text-[15px] leading-snug">{texte}</p>
        <button
          type="button"
          onClick={fermer}
          aria-label="Fermer"
          className="shrink-0 rounded-full p-1 hover:bg-white/15"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default BandeauAnnonce;
