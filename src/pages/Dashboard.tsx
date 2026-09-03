import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
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

const PALIERS: Record<string, string> = {
  essentiel: "Essentiel",
  souvenir: "Souvenir",
  heritage: "Héritage",
  admin: "Administration",
};

const createSchema = z.object({
  name: z.string().trim().min(2, "Nom trop court").max(100),
  event_date: z.string().min(1, "Date requise"),
  event_type: z.string().min(1, "Type requis"),
});

const Dashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
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
      const data = createSchema.parse(form);
      const { error } = await supabase.from("events").insert({
        user_id: user.id,
        name: data.name,
        event_date: data.event_date,
        event_type: data.event_type,
        plan: "admin",
        statut: "actif",
      });
      if (error) throw error;
      toast({ title: "Événement créé !", description: "Votre QR code est prêt." });
      setOpen(false);
      setForm({ name: "", event_date: "", event_type: "" });
      loadEvents();
    } catch (err: any) {
      toast({
        title: "Erreur",
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
        <p className="text-muted-foreground">Chargement...</p>
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
              <h1 className="text-4xl md:text-5xl font-bold mb-2">
                Mes <span>événements</span>
              </h1>
              <p className="text-muted-foreground">Gérez vos albums et partagez vos QR codes</p>
            </div>
            {!admin && (
              <Button variant="hero" size="lg" asChild>
                <Link to="/pricing">
                  <Plus className="w-5 h-5" /> Créer un événement
                </Link>
              </Button>
            )}
            <Dialog open={admin && open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="hero" size="lg" className={admin ? "" : "hidden"}>
                  <Plus className="w-5 h-5" /> Créer un événement
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvel événement</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de l'événement</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Mariage de Sophie & Marc"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={form.event_date}
                      onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Choisir un type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mariage">Mariage</SelectItem>
                        <SelectItem value="anniversaire">Anniversaire</SelectItem>
                        <SelectItem value="soiree">Soirée</SelectItem>
                        <SelectItem value="entreprise">Entreprise</SelectItem>
                        <SelectItem value="autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
                    {submitting ? "Création..." : "Créer l'événement"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {fetching ? (
            <p className="text-center text-muted-foreground py-12">Chargement de vos événements...</p>
          ) : events.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <QrCode className="w-16 h-16 text-primary mx-auto mb-4 opacity-60" />
              <h2 className="text-xl font-semibold mb-2">Aucun événement pour l'instant</h2>
              <p className="text-muted-foreground mb-6">Créez votre premier événement pour commencer.</p>
              {admin ? (
                <Button variant="hero" size="lg" onClick={() => setOpen(true)}>
                  <Plus className="w-5 h-5" /> Créer mon premier événement
                </Button>
              ) : (
                <Button variant="hero" size="lg" asChild>
                  <Link to="/pricing">
                    <Plus className="w-5 h-5" /> Choisir ma formule
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
                        {ev.event_type}
                      </span>
                      {ev.plan && (
                        <span className="label-mono border border-border px-2 py-1">
                          {PALIERS[ev.plan] ?? ev.plan}
                        </span>
                      )}
                    </div>
                    <QrCode className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{ev.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <Calendar className="w-4 h-4" />
                    {new Date(ev.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="w-4 h-4" />
                    {ev.photo_count} photo{ev.photo_count !== 1 ? "s" : ""}
                  </div>
                  {ev.expire_le && (
                    <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                      Photos conservées jusqu'au{" "}
                      {new Date(`${ev.expire_le}T12:00:00Z`).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "long", year: "numeric",
                      })}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
