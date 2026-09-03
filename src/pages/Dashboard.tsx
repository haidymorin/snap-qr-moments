import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MotDePasse from "@/components/MotDePasse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, Image as ImageIcon, Plus, QrCode } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
  unique_code: string;
  plan: string;
  statut: string;
  expire_le: string | null;
  photo_count?: number;
}

/* Les textes de cette page, dans les deux langues.
 *
 * Elle était entièrement écrite en français dans le code : basculer en anglais
 * ne changeait rien, ce que voyait tout de suite un visiteur anglophone connecté.
 *
 * Les noms des formules, eux, ne sont pas traduits — voir plus bas. */
const TEXTES = {
  fr: {
    chargement: "Chargement…",
    titre: "Mes événements",
    sousTitre: "Gérez vos albums et partagez vos QR codes",
    creer: "Créer un événement",
    nouvel: "Nouvel événement",
    nom: "Nom de l'événement",
    nomExemple: "Mariage de Camille et Sacha",
    date: "Date",
    type: "Type",
    choisirType: "Choisir un type",
    types: {
      mariage: "Mariage", anniversaire: "Anniversaire", soiree: "Soirée",
      entreprise: "Entreprise", autre: "Autre",
    } as Record<string, string>,
    envoi: "Création…",
    valider: "Créer l'événement",
    chargementListe: "Chargement de vos événements…",
    vide: "Aucun événement pour l'instant",
    videTexte: "Choisissez une formule pour créer votre premier événement.",
    premier: "Créer mon premier événement",
    choisirFormule: "Choisir ma formule",
    photo: "photo", photos: "photos",
    conservees: "Photos conservées jusqu'au",
    creeTitre: "Événement créé",
    creeTexte: "Votre QR code est prêt.",
    erreur: "Erreur",
    nomCourt: "Nom trop court",
    dateRequise: "Date requise",
    typeRequis: "Type requis",
  },
  en: {
    chargement: "Loading…",
    titre: "My events",
    sousTitre: "Manage your albums and share your QR codes",
    creer: "Create an event",
    nouvel: "New event",
    nom: "Event name",
    nomExemple: "Camille and Sacha's wedding",
    date: "Date",
    type: "Type",
    choisirType: "Choose a type",
    types: {
      mariage: "Wedding", anniversaire: "Birthday", soiree: "Party",
      entreprise: "Company event", autre: "Other",
    } as Record<string, string>,
    envoi: "Creating…",
    valider: "Create the event",
    chargementListe: "Loading your events…",
    vide: "No events yet",
    videTexte: "Choose a plan to create your first event.",
    premier: "Create my first event",
    choisirFormule: "Choose my plan",
    photo: "photo", photos: "photos",
    conservees: "Photos kept until",
    creeTitre: "Event created",
    creeTexte: "Your QR code is ready.",
    erreur: "Error",
    nomCourt: "Name too short",
    dateRequise: "Date required",
    typeRequis: "Type required",
  },
};

/* Les noms des formules, dans les deux langues.
 *
 * « Souvenir » ne bouge pas : c'est déjà un mot anglais, et c'est lui qui fait
 * le pont entre les deux versions. Les deux autres s'écrivent correctement
 * dans chaque langue plutôt qu'à moitié — « Essentiel » sur une page anglaise
 * se lirait comme une faute de frappe pour *Essential*, et l'accent
 * d'« Héritage » comme une coquille. Un nom de produit doit avoir l'air
 * choisi, jamais raté. */
const PALIERS: Record<"fr" | "en", Record<string, string>> = {
  fr: {
    essentiel: "Essentiel",
    souvenir: "Souvenir",
    heritage: "Héritage",
    admin: "Administration",
  },
  en: {
    essentiel: "Essential",
    souvenir: "Souvenir",
    heritage: "Heritage",
    admin: "Administration",
  },
};

const creerSchema = (T: (typeof TEXTES)["fr"]) =>
  z.object({
    name: z.string().trim().min(2, T.nomCourt).max(100),
    event_date: z.string().min(1, T.dateRequise),
    event_type: z.string().min(1, T.typeRequis),
  });

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lang } = useLanguage();
  const T = TEXTES[lang === "en" ? "en" : "fr"];
  const [events, setEvents] = useState<EventRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", event_date: "", event_type: "" });
  /* Créer un événement à la main est réservé à l'administration : pour tout le
     monde d'autre, un événement naît d'un paiement. La règle est appliquée par
     la base, celle-ci ne fait qu'éviter d'afficher un bouton qui échouerait. */
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("est_admin").then(({ data }) => setAdmin(data === true));
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?mode=signin", { replace: true });
  }, [user, loading, navigate]);

  const loadEvents = async () => {
    if (!user) return;
    setFetching(true);
    const { data: ev, error } = await supabase
      .from("events")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: T.erreur, description: error.message, variant: "destructive" });
    } else {
      // Get photo counts
      const ids = (ev ?? []).map((e) => e.id);
      let counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: photos } = await supabase
          .from("photos")
          .select("event_id")
          .in("event_id", ids);
        (photos ?? []).forEach((p) => {
          counts[p.event_id] = (counts[p.event_id] ?? 0) + 1;
        });
      }
      setEvents((ev ?? []).map((e) => ({ ...e, photo_count: counts[e.id] ?? 0 })));
    }
    setFetching(false);
  };

  useEffect(() => {
    if (user) loadEvents();
  }, [user]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      const data = creerSchema(T).parse(form);
      const { error } = await supabase.from("events").insert({
        user_id: user.id,
        name: data.name,
        event_date: data.event_date,
        event_type: data.event_type,
        plan: "admin",
        statut: "actif",
      });
      if (error) throw error;
      toast({ title: T.creeTitre, description: T.creeTexte });
      setOpen(false);
      setForm({ name: "", event_date: "", event_type: "" });
      loadEvents();
    } catch (err: any) {
      toast({
        title: T.erreur,
        description: err.errors?.[0]?.message || err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{T.chargement}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 gap-4 animate-fade-in">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-2">{T.titre}</h1>
              <p className="text-muted-foreground">{T.sousTitre}</p>
            </div>
            {!admin && (
              <Button variant="hero" size="lg" asChild>
                <Link to="/pricing">
                  <Plus className="w-5 h-5" /> {T.creer}
                </Link>
              </Button>
            )}
            <Dialog open={admin && open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="lg" className={admin ? "" : "hidden"}>
                  <Plus className="w-5 h-5" /> {T.creer}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{T.nouvel}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">{T.nom}</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={T.nomExemple}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">{T.date}</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.event_date}
                      onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">{T.type}</Label>
                    <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                      <SelectTrigger><SelectValue placeholder={T.choisirType} /></SelectTrigger>
                      <SelectContent>
                        {(["mariage", "anniversaire", "soiree", "entreprise", "autre"] as const).map((k) => (
                          <SelectItem key={k} value={k}>{T.types[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? T.envoi : T.valider}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {fetching ? (
            <p className="text-center text-muted-foreground py-12">{T.chargementListe}</p>
          ) : events.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <QrCode className="w-16 h-16 text-primary mx-auto mb-4 opacity-60" />
              <h2 className="text-xl font-semibold mb-2">{T.vide}</h2>
              <p className="text-muted-foreground mb-6">{T.videTexte}</p>
              {admin ? (
                <Button variant="hero" size="lg" onClick={() => setOpen(true)}>
                  <Plus className="w-5 h-5" /> {T.premier}
                </Button>
              ) : (
                <Button variant="hero" size="lg" asChild>
                  <Link to="/pricing">
                    <Plus className="w-5 h-5" /> {T.choisirFormule}
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((ev) => (
                <Link
                  key={ev.id}
                  to={`/dashboard/event/${ev.id}`}
                  className="p-6 bg-card rounded-2xl border border-border shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-border px-2 py-1 text-xs font-medium capitalize text-muted-foreground">
                        {T.types[ev.event_type] ?? ev.event_type}
                      </span>
                      {ev.plan && (
                        <span className="label-mono border border-border px-2 py-1">
                          {PALIERS[lang === "en" ? "en" : "fr"][ev.plan] ?? ev.plan}
                        </span>
                      )}
                    </div>
                    <QrCode className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{ev.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar className="w-4 h-4" />
                    {new Date(ev.event_date).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    {ev.photo_count} {ev.photo_count === 1 ? T.photo : T.photos}
                  </div>
                  {ev.expire_le && (
                    <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      {T.conservees}{" "}
                      {new Date(`${ev.expire_le}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-GB" : "fr-FR", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}

          <MotDePasse />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
