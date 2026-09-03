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
              <p>Email de l'organisateur, photos uploadées par les invités.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Base légale</h2>
              <p>Consentement (Article 6 RGPD).</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Durée de conservation</h2>
              <p>60 jours après l'événement. Option de stockage longue durée disponible.</p>
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
