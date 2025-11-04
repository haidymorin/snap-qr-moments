import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const PricingCard = ({
  name,
  price,
  period,
  description,
  features,
  highlighted = false,
  badge,
}: PricingCardProps) => {
  return (
    <div
      className={`relative p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-2 ${
        highlighted
          ? "bg-gradient-card border-primary shadow-card scale-105"
          : "bg-card border-border shadow-soft hover:shadow-card"
      }`}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-hero text-white px-4 py-1 rounded-full text-sm font-semibold shadow-card">
          {badge}
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">{name}</h3>
        <p className="text-muted-foreground text-sm mb-4">{description}</p>
        <div className="flex items-end justify-center gap-1">
          <span className="text-4xl font-bold">{price}</span>
          {period && <span className="text-muted-foreground mb-2">/{period}</span>}
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <Button
        asChild
        variant={highlighted ? "hero" : "outline"}
        size="lg"
        className="w-full"
      >
        <Link to="/contact">Commencer</Link>
      </Button>
    </div>
  );
};

export default PricingCard;
