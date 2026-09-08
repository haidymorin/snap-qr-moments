import { Link } from "react-router-dom";
import { useLanguage, Lang } from "@/contexts/LanguageContext";

/* Ce qui bloque, dit à voix haute — et ce qui rassure, sorti de l'ombre.
 *
 * Deux blocs qui n'en font qu'un, parce qu'ils répondent à la même chose : la
 * peur de dépenser 179 € pour un service qu'on ne connaît pas, sur le seul
 * jour qu'on ne pourra pas refaire.
 *
 * Volontairement écrit en affirmations, pas en questions. Une page qui demande
 * « et si vos invités ne jouaient pas le jeu ? » installe un doute que le
 * visiteur n'avait pas forcément. On répond à l'objection sans la formuler
 * comme une objection.
 *
 * Et seulement deux sujets. Ce sont les deux qui font vraiment reculer :
 * personne ne participe, et le réseau de la salle ne passe pas. Le reste tient
 * dans la FAQ des tarifs.
 */

const T: Record<Lang, {
  eyebrow: string; titre: string;
  points: { titre: string; texte: string }[];
  gages: string[];
  gagesNote: string;
}> = {
  fr: {
    eyebrow: "Ce qu'on nous demande le plus",
    titre: "Deux inquiétudes, deux réponses.",
    points: [
      {
        titre: "Vos invités participent, parce que tout les y pousse",
        texte:
          "Un panneau à l'entrée, un chevalet sur chaque table, et le QR code sous les yeux pendant tout le repas. Sur les formules avec diaporama, les photos s'affichent au fur et à mesure sur grand écran : c'est ce qui déclenche le reste de la salle. Et il n'y a rien à installer ni de compte à créer — c'est là que les autres solutions perdent la moitié des invités.",
      },
      {
        titre: "Le réseau de la salle ne fait pas tout rater",
        texte:
          "Les salles de réception ont souvent une 4G saturée à vingt-et-une heures. Les photos qui n'ont pas pu partir restent en attente sur la page de votre invité : un bouton les renvoie dès que le réseau revient, et rien n'est perdu entre-temps. Les dépôts restent ouverts après la soirée — beaucoup d'invités envoient leurs photos le lendemain matin.",
      },
    ],
    gages: [
      "Paiement par carte traité par Stripe, votre numéro ne passe jamais par nos serveurs",
      "Photos et vidéos hébergées en Europe",
      "Vos données ne sont ni vendues ni transmises à qui que ce soit",
      "Tout est supprimé définitivement à l'échéance, sauvegardes comprises",
      "La reconnaissance faciale est facultative, invité par invité",
      "Un seul paiement, pas d'abonnement, pas de commission sur vos photos",
    ],
    gagesNote: "Une question avant de vous décider ? Écrivez-nous, c'est une personne qui répond.",
  },
  en: {
    eyebrow: "What people ask us most",
    titre: "Two worries, two answers.",
    points: [
      {
        titre: "Your guests take part, because everything nudges them to",
        texte:
          "A sign at the entrance, a card on every table, and the QR code in front of them throughout the meal. On plans with the slideshow, photos appear on the big screen as they arrive: that is what sets the rest of the room off. And there is nothing to install and no account to create — that is where other solutions lose half the guests.",
      },
      {
        titre: "The venue's network does not ruin it",
        texte:
          "Reception venues often have saturated mobile data by nine in the evening. Photos that could not be sent stay waiting on your guest's page: one button sends them again as soon as the network is back, and nothing is lost meanwhile. Uploads stay open after the party — many guests send their photos the next morning.",
      },
    ],
    gages: [
      "Card payment handled by Stripe, your number never passes through our servers",
      "Photos and videos hosted in Europe",
      "Your data is never sold or passed on to anyone",
      "Everything is permanently deleted at the deadline, backups included",
      "Face recognition is optional, guest by guest",
      "One payment, no subscription, no commission on your photos",
    ],
    gagesNote: "A question before you decide? Write to us — a person answers.",
  },
};

const Rassurance = () => {
  const { lang } = useLanguage();
  const t = T[lang];

  return (
    <section className="border-t border-border bg-card py-[clamp(58px,7.5vw,100px)]">
      <div className="mx-auto max-w-[1180px] px-[clamp(20px,5vw,48px)]">
        <div className="mx-auto mb-[clamp(30px,4vw,48px)] max-w-2xl text-center">
          <p className="eyebrow">{t.eyebrow}</p>
          <h2 className="mt-3 text-[clamp(30px,4.5vw,54px)] text-wrap balance">{t.titre}</h2>
        </div>

        <div className="grid gap-[clamp(14px,1.8vw,22px)] md:grid-cols-2">
          {t.points.map((p) => (
            <article key={p.titre} className="rounded-2xl border border-border bg-background p-[clamp(22px,2.6vw,32px)]">
              <h3 className="text-[clamp(19px,1.8vw,24px)] leading-snug">{p.titre}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{p.texte}</p>
            </article>
          ))}
        </div>

        {/* Les engagements étaient enterrés dans la politique de
            confidentialité. Ce sont pourtant des arguments de vente : très peu
            de services promettent de supprimer les données, et encore moins
            l'écrivent. */}
        <ul className="mt-[clamp(22px,2.6vw,32px)] grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {t.gages.map((g) => (
            <li key={g} className="flex gap-3 text-[14px] leading-relaxed text-foreground">
              <span aria-hidden className="mt-[9px] block h-px w-3 shrink-0 bg-accent" />
              <span>{g}</span>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-[14px] text-muted-foreground">
          {t.gagesNote}{" "}
          <Link to="/contact" className="border-b border-foreground text-foreground">
            {lang === "fr" ? "Nous écrire" : "Write to us"}
          </Link>
        </p>
      </div>
    </section>
  );
};

export default Rassurance;
