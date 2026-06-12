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
import { Mail, Lock, User, Eye, EyeOff, MailCheck } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const defaultTab = searchParams.get("mode") === "signin" ? "signin" : "signup";

  const signUpSchema = z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    password: z.string().min(6).max(72),
  });
  const signInSchema = z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(1).max(72),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signUpData, setSignUpData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [signInData, setSignInData] = useState({ email: "", password: "" });
  const [showSuPw, setShowSuPw] = useState(false);
  const [showSuConfirmPw, setShowSuConfirmPw] = useState(false);
  const [showSiPw, setShowSiPw] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmError(null);
    if (signUpData.password !== signUpData.confirmPassword) {
      setConfirmError(t("auth.mismatch"));
      return;
    }
    setIsSubmitting(true);
    try {
      const data = signUpSchema.parse({
        fullName: signUpData.fullName,
        email: signUpData.email,
        password: signUpData.password,
      });
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: { full_name: data.fullName },
        },
      });
      if (error) throw error;
      // Email confirmation is disabled — sign the user in immediately.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (signInError) throw signInError;
      toast({ title: t("auth.welcomeBack"), description: t("auth.welcomeBackDesc") });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({
        title: t("auth.errorTitle"),
        description: err.errors?.[0]?.message || err.message || t("auth.errorGeneric"),
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
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      toast({ title: t("auth.welcomeBack"), description: t("auth.welcomeBackDesc") });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: t("auth.errorTitle"),
        description: err.errors?.[0]?.message || t("auth.errorInvalidCreds"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pwToggle = (visible: boolean, setVisible: (v: boolean) => void) => (
    <button
      type="button"
      onClick={() => setVisible(!visible)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      aria-label={visible ? t("auth.hidePw") : t("auth.showPw")}
    >
      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8 animate-fade-in">
              <h1 className="text-4xl font-bold mb-3">
                {t("auth.welcome")}{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">QR Memories</span>
              </h1>
              <p className="text-muted-foreground">{t("auth.subtitle")}</p>
            </div>

            <div className="p-8 bg-card rounded-2xl border border-border shadow-card">
              {signUpSuccess ? (
                <div className="text-center space-y-5 py-4 animate-fade-in">
                  <div className="w-16 h-16 mx-auto bg-gradient-hero rounded-full flex items-center justify-center">
                    <MailCheck className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">{t("auth.checkEmailTitle")}</h2>
                  <p className="text-muted-foreground">{t("auth.checkEmailDesc")}</p>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setSignUpSuccess(false);
                      navigate("/auth?mode=signin");
                    }}
                  >
                    {t("auth.backToSignIn")}
                  </Button>
                </div>
              ) : (
                <Tabs defaultValue={defaultTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
                    <TabsTrigger value="signin">{t("auth.signin")}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="su-name" className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" /> {t("auth.fullName")}
                        </Label>
                        <Input
                          id="su-name"
                          value={signUpData.fullName}
                          onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                          placeholder={t("auth.placeholderName")}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="su-email" className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-primary" /> {t("auth.email")}
                        </Label>
                        <Input
                          id="su-email"
                          type="email"
                          value={signUpData.email}
                          onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="su-pw" className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-primary" /> {t("auth.password")}
                        </Label>
                        <div className="relative">
                          <Input
                            id="su-pw"
                            type={showSuPw ? "text" : "password"}
                            value={signUpData.password}
                            onChange={(e) => {
                              setSignUpData({ ...signUpData, password: e.target.value });
                              if (confirmError) setConfirmError(null);
                            }}
                            placeholder={t("auth.placeholderPw")}
                            className="pr-10"
                            required
                          />
                          {pwToggle(showSuPw, setShowSuPw)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="su-pw2" className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-primary" /> {t("auth.confirmPassword")}
                        </Label>
                        <div className="relative">
                          <Input
                            id="su-pw2"
                            type={showSuConfirmPw ? "text" : "password"}
                            value={signUpData.confirmPassword}
                            onChange={(e) => {
                              setSignUpData({ ...signUpData, confirmPassword: e.target.value });
                              if (confirmError) setConfirmError(null);
                            }}
                            placeholder={t("auth.placeholderPwConfirm")}
                            className={`pr-10 ${confirmError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                            required
                          />
                          {pwToggle(showSuConfirmPw, setShowSuConfirmPw)}
                        </div>
                        {confirmError && (
                          <p className="text-sm text-destructive">{confirmError}</p>
                        )}
                      </div>
                      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? t("auth.creating") : t("auth.createAccount")}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="si-email" className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-primary" /> {t("auth.email")}
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
                          <Lock className="w-4 h-4 text-primary" /> {t("auth.password")}
                        </Label>
                        <div className="relative">
                          <Input
                            id="si-pw"
                            type={showSiPw ? "text" : "password"}
                            value={signInData.password}
                            onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                            className="pr-10"
                            required
                          />
                          {pwToggle(showSiPw, setShowSiPw)}
                        </div>
                      </div>
                      <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? t("auth.signingIn") : t("auth.signInBtn")}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Auth;
