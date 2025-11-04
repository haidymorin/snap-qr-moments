import { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  step?: number;
}

const FeatureCard = ({ icon, title, description, step }: FeatureCardProps) => {
  return (
    <div className="relative p-8 bg-card rounded-2xl border border-border shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1 group">
      {step && (
        <div className="absolute -top-4 -left-4 w-10 h-10 bg-gradient-hero rounded-full flex items-center justify-center text-white font-bold shadow-card">
          {step}
        </div>
      )}
      <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default FeatureCard;
