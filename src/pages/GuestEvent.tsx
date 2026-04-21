import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Camera, Check, Loader2 } from "lucide-react";

interface EventRow {
  id: string;
  name: string;
  event_date: string;
  event_type: string;
}
interface PhotoRow {
  id: string;
  url: string;
  file_name: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per photo
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const GuestEvent = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const loadPhotos = async () => {
    if (!id) return;
    const { data } = await supabase
      .from("photos")
      .select("*")
      .eq("event_id", id)
      .order("uploaded_at", { ascending: false });
    setPhotos(data ?? []);
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: ev } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
      setEvent(ev);
      await loadPhotos();
      setLoading(false);
    })();
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !id || !event) return;
    const files = Array.from(e.target.files);
    setUploading(true);
    let uploadedCount = 0;

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: `${file.name} ignoré`, description: "Format non supporté", variant: "destructive" });
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: `${file.name} ignoré`, description: "Fichier trop lourd (max 10 Mo)", variant: "destructive" });
        continue;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${id}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage.from("event-photos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upErr) {
        toast({ title: "Erreur upload", description: upErr.message, variant: "destructive" });
        continue;
      }

      const { data: pub } = supabase.storage.from("event-photos").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("photos").insert({
        event_id: id,
        url: pub.publicUrl,
        file_name: file.name,
        storage_path: path,
      });
      if (dbErr) {
        toast({ title: "Erreur", description: dbErr.message, variant: "destructive" });
        continue;
      }
      uploadedCount++;
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (uploadedCount > 0) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      loadPhotos();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">Événement introuvable</h1>
          <p className="text-muted-foreground">Vérifiez le lien ou le QR code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        {/* Hero */}
        <div className="bg-gradient-hero text-white py-10 px-4 text-center">
          <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium inline-block mb-3 capitalize">
            {event.event_type}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{event.name}</h1>
          <div className="flex items-center justify-center gap-2 text-white/90 text-sm">
            <Calendar className="w-4 h-4" />
            {new Date(event.event_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        <div className="container mx-auto px-4 max-w-4xl">
          {/* Upload */}
          <div className="-mt-8 mb-10">
            <div className="bg-card rounded-2xl border border-border shadow-card p-6 text-center">
              {showSuccess ? (
                <div className="py-4 animate-fade-in">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Check className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-lg font-semibold">Vos photos ont bien été partagées ! 🎉</p>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button
                    variant="hero"
                    size="lg"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full sm:w-auto text-lg h-14 px-10"
                  >
                    {uploading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours...</>
                    ) : (
                      <><Camera className="w-6 h-6" /> Ajouter mes photos</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    Plusieurs photos à la fois · Aucune inscription requise
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Gallery */}
          <h2 className="text-xl font-bold mb-4">
            Album partagé <span className="text-muted-foreground font-normal">({photos.length})</span>
          </h2>
          {photos.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border">
              <p className="text-muted-foreground">Soyez le premier à partager une photo !</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((p) => (
                <a
                  key={p.id}
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square overflow-hidden rounded-xl bg-card border border-border shadow-soft hover:shadow-card transition-all"
                >
                  <img src={p.url} alt={p.file_name} loading="lazy" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GuestEvent;
