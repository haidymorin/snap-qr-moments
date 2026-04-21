import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User } from "lucide-react";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Le nom doit contenir au moins 2 caractères").max(100),
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères").max(72),
});

const signInSchema = z.object({
  email: z.string().trim().email("Email invalide").max(255),
  password: z.string().min(1, "Mot de passe requis").max(72),
});

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const defaultTab = searchParams.get("mode") === "signin" ? "signin" : "signup";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signUpData, setSignUpData] = useState({ fullName: "", email: "", password: "" });
  const [signInData, setSignInData] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = signUpSchema.parse(signUpData);
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: data.fullName },
        },
      });
      if (error) throw error;
      toast({ title: "Compte créé !", description: "Bienvenue sur QR Memories." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.errors?.[0]?.message || err.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = signInSchema.parse(signInData);
      const { error } = await supabase.auth.signInWithPassword(data);
      if (error) throw error;
      toast({ title: "Bienvenue !", description: "Connexion réussie." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.errors?.[0]?.message || err.message || "Identifiants invalides",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <h1 className="text-4xl font-bold mb-3">
                Bienvenue sur <span className="bg-gradient-hero bg-clip-text text-transparent">QR Memories</span>
              </h1>
              <p className="text-muted-foreground">Créez et gérez vos albums événements</p>
            </div>

            <div className="p-8 bg-card rounded-2xl border border-border shadow-card">
              <Tabs defaultValue={defaultTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signup">Inscription</TabsTrigger>
                  <TabsTrigger value="signin">Connexion</TabsTrigger>
                </TabsList>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="su-name" className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" /> Nom complet
                      </Label>
                      <Input
                        id="su-name"
                        value={signUpData.fullName}
                        onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                        placeholder="Jean Dupont"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" /> Email
                      </Label>
                      <Input
                        id="su-email"
                        type="email"
                        value={signUpData.email}
                        onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                        placeholder="vous@example.com"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-pw" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" /> Mot de passe
                      </Label>
                      <Input
                        id="su-pw"
                        type="password"
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        placeholder="6 caractères minimum"
                        required
                      />
                    </div>
                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Création..." : "Créer mon compte"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="si-email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" /> Email
                      </Label>
                      <Input
                        id="si-email"
                        type="email"
                        value={signInData.email}
                        onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="si-pw" className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-primary" /> Mot de passe
                      </Label>
                      <Input
                        id="si-pw"
                        type="password"
                        value={signInData.password}
                        onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Connexion..." : "Se connecter"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
