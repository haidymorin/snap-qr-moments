import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Download, ArrowLeft, Copy, Check } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
  unique_code: string;
  user_id: string;
}
interface PhotoRow {
  id: string;
  url: string;
  file_name: string;
  uploaded_at: string;
}

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [zipping, setZipping] = useState(false);
  const [copied, setCopied] = useState(false);

  const guestUrl = id ? `${window.location.origin}/event/${id}` : "";

  useEffect(() => {
    if (!loading && !user) navigate("/auth?mode=signin", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data: ev, error } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      if (error || !ev) {
        toast({ title: "Événement introuvable", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      if (ev.user_id !== user.id) {
        toast({ title: "Accès refusé", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setEvent(ev);
      const { data: ph } = await supabase
        .from("photos")
        .select("*")
        .eq("event_id", id)
        .order("uploaded_at", { ascending: false });
      setPhotos(ph ?? []);
      setFetching(false);
    })();
  }, [user, id, navigate, toast]);

  const downloadQR = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${event?.name.replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(guestUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadZip = async () => {
    if (photos.length === 0) {
      toast({ title: "Aucune photo à télécharger" });
      return;
    }
    setZipping(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        photos.map(async (p) => {
          const res = await fetch(p.url);
          const blob = await res.blob();
          zip.file(p.file_name, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${event?.name.replace(/\s+/g, "-")}-photos.zip`);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setZipping(false);
    }
  };

  if (loading || fetching || !event) {
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
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
            <ArrowLeft className="w-4 h-4" /> Retour au dashboard
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <div className="px-3 py-1 bg-accent rounded-full text-xs font-medium text-accent-foreground capitalize inline-block mb-3">
                {event.event_type}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-3">
                <span className="bg-gradient-hero bg-clip-text text-transparent">{event.name}</span>
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <Calendar className="w-5 h-5" />
                {new Date(event.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="p-6 bg-card rounded-2xl border border-border shadow-soft">
                <p className="text-sm text-muted-foreground mb-2">Lien à partager avec vos invités :</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <code className="flex-1 px-4 py-2 bg-muted rounded-lg text-sm break-all">{guestUrl}</code>
                  <Button variant="outline" onClick={copyLink}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copié" : "Copier"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gradient-card rounded-2xl border border-primary/30 shadow-card text-center">
              <p className="text-sm font-medium text-muted-foreground mb-4">Votre QR Code</p>
              <div ref={qrRef} className="bg-white p-4 rounded-xl inline-block mb-4">
                <QRCodeCanvas value={guestUrl} size={180} level="H" />
              </div>
              <Button variant="hero" className="w-full" onClick={downloadQR}>
                <Download className="w-4 h-4" /> Télécharger PNG
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h2 className="text-2xl font-bold">
              Galerie <span className="text-muted-foreground text-lg font-normal">({photos.length})</span>
            </h2>
            <Button variant="outline" onClick={downloadZip} disabled={zipping || photos.length === 0}>
              <Download className="w-4 h-4" /> {zipping ? "Préparation..." : "Tout télécharger (ZIP)"}
            </Button>
          </div>

          {photos.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <p className="text-muted-foreground">Aucune photo pour l'instant. Partagez le QR code à vos invités !</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square overflow-hidden rounded-xl bg-card border border-border shadow-soft hover:shadow-card hover:-translate-y-1 transition-all duration-300"
                >
                  <img src={p.url} alt={p.file_name} loading="lazy" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default EventDetail;
