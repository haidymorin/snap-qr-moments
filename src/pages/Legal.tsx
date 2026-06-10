import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Legal = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">
            Mentions <span className="bg-gradient-hero bg-clip-text text-transparent">légales</span>
          </h1>

          <div className="space-y-8 text-muted-foreground leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Éditeur</h2>
              <p>QR Memories, Haïdy Morin, France.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Statut</h2>
              <p>Micro-entreprise en cours de création.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">Hébergeur</h2>
              <p>Lovable / Supabase.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Legal;
