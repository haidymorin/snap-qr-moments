import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            Politique de <span>confidentialité</span>
          </h1>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Responsable du traitement</h2>
              <p>QR Memories, Haïdy Morin, France.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Données collectées</h2>
              <p className="mb-3">
                De l'organisateur, au moment où il crée son événement : prénom, nom, adresse
                email, téléphone s'il le renseigne, et les informations de l'événement lui-même
                (nom, date, type, formule choisie). Ces informations sont enregistrées dès la
                première étape du parcours, avant le paiement, afin que nous puissions reprendre
                contact si la création reste inachevée.
              </p>
              <p className="mb-3">
                Des invités : les photos, vidéos et messages qu'ils déposent, ainsi que le prénom
                qu'ils indiquent s'ils le souhaitent. Aucun compte n'est créé, aucune adresse
                email ne leur est demandée.
              </p>
              <p>
                Les coordonnées bancaires ne transitent jamais par nos serveurs : elles sont
                saisies directement chez Stripe, notre prestataire de paiement.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Base légale</h2>
              <p className="mb-3">
                Pour les coordonnées de l'organisateur et les informations de son événement :
                l'exécution du contrat, puis notre intérêt légitime à reprendre contact avec une
                personne ayant commencé une création restée inachevée (article 6.1.b et 6.1.f du
                RGPD).
              </p>
              <p className="mb-3">
                Pour les photos, vidéos et messages déposés par les invités : leur consentement,
                donné au moment du dépôt (article 6.1.a).
              </p>
              <p>
                Pour l'envoi de nos actualités et conseils par email : votre consentement
                exprès, recueilli par une case à cocher distincte, jamais pré-cochée, et
                indépendante de la commande. Chaque message contient un lien de désinscription ;
                vous pouvez aussi nous écrire à contact@qr-memories.fr.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Durée de conservation</h2>
              <p className="mb-3">
                Photos, vidéos et messages : six mois à compter de la date de l'événement, sauf
                prolongation souscrite par l'organisateur. Passée cette échéance, tout est
                supprimé définitivement, sauvegardes comprises. Un rappel est envoyé trente jours
                avant.
              </p>
              <p className="mb-3">
                Coordonnées de l'organisateur : trois ans à compter du dernier contact, puis
                suppression. Les factures et pièces comptables sont conservées dix ans, comme la
                loi l'impose.
              </p>
              <p>
                Coordonnées des personnes ayant accepté de recevoir nos emails : jusqu'à leur
                désinscription, et au plus trois ans sans réaction de leur part.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Données biométriques</h2>
              <p>
                La reconnaissance faciale est strictement opt-in : un consentement explicite est requis. Les embeddings
                sont supprimés après génération de l'album.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Vos droits</h2>
              <p>
                Vous disposez d'un droit d'accès, de rectification et d'effacement. Pour les exercer, contactez-nous via
                la page contact.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Hébergement</h2>
              <p>Supabase, Union Européenne.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
