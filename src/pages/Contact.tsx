import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Mail, User, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Contact = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    eventType: "",
    eventDate: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: "Message envoyé !",
      description: "Nous vous répondrons dans les plus brefs délais.",
    });

    setFormData({
      name: "",
      email: "",
      eventType: "",
      eventDate: "",
      message: "",
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Hero */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Créez votre <span className="bg-gradient-hero bg-clip-text text-transparent">événement</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Remplissez le formulaire ci-dessous et nous vous contacterons rapidement pour configurer votre album événement.
            </p>
          </div>

          {/* Form */}
          <div className="max-w-2xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-6 p-8 bg-card rounded-2xl border border-border shadow-card">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Nom complet
                </Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Jean Dupont"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jean.dupont@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventType" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Type d'événement
                </Label>
                <Input
                  id="eventType"
                  name="eventType"
                  placeholder="Mariage, Anniversaire, Soirée d'entreprise..."
                  value={formData.eventType}
                  onChange={handleChange}
                  required
                  className="border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date de l'événement
                </Label>
                <Input
                  id="eventDate"
                  name="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={handleChange}
                  required
                  className="border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Message (optionnel)
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  placeholder="Parlez-nous de votre événement..."
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  className="border-border resize-none"
                />
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full">
                Créer mon événement
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe concernant votre événement.
              </p>
            </form>

            {/* Additional Info */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-gradient-card rounded-xl border border-border shadow-soft text-center">
                <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Email</h3>
                <p className="text-muted-foreground">contact@qrmemories.com</p>
              </div>

              <div className="p-6 bg-gradient-card rounded-xl border border-border shadow-soft text-center">
                <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Support</h3>
                <p className="text-muted-foreground">Réponse en moins de 24h</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
