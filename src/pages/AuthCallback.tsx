import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Supabase JS auto-detects the hash/code in the URL on load.
        // Give the auth listener a tick, then read the session.
        const { data, error } = await supabase.auth.getSession();
        if (cancelled) return;
        if (error) throw error;

        if (data.session) {
          navigate("/dashboard", { replace: true });
        } else {
          toast({
            title: "Lien expiré ou invalide",
            description: "Veuillez vous reconnecter.",
            variant: "destructive",
          });
          navigate("/auth?mode=signin", { replace: true });
        }
      } catch {
        if (cancelled) return;
        toast({
          title: "Lien expiré ou invalide",
          description: "Veuillez vous reconnecter.",
          variant: "destructive",
        });
        navigate("/auth?mode=signin", { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
        <p className="text-muted-foreground">Connexion en cours...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
