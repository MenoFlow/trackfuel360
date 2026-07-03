import {  Parametre } from "@/lib/data/mockData.parametres";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

interface ParametreCardProps {
  parametre: Parametre;
  value: number;
  onChange: (id: string, value: number) => void;
}

const ParametreCard = ({ parametre, value, onChange }: ParametreCardProps) => {
  const { t } = useTranslation();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (!isNaN(newValue) && newValue >= parametre.min && newValue <= parametre.max) {
      onChange(parametre.id, newValue);
    }
  };

  const label = t(`notification.param.${parametre.id}.label`);
  const description = t(`notification.param.${parametre.id}.description`);
  const minMaxText = `Min: ${parametre.min} — Max: ${parametre.max}`;

  return (
    <article 
      className="bg-card border border-border rounded-xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-200"
      aria-label={label}
    >
      <div className="space-y-4">
        <div>
          <Label 
            htmlFor={parametre.id} 
            className="text-lg font-semibold text-foreground block mb-2"
          >
            {label}
          </Label>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Input
            id={parametre.id}
            type="number"
            value={value}
            onChange={handleChange}
            min={parametre.min}
            max={parametre.max}
            step={parametre?.id?.includes("pct") ? 1 : parametre?.id?.includes("litres") ? 0.1 : 0.5}
            className="flex-1 text-lg font-medium h-12"
            aria-label={`${label}: ${value} ${parametre.unite}`}
            aria-describedby={`${parametre.id}-range`}
          />
          <span 
            className="text-base text-muted-foreground font-semibold min-w-[3rem] text-right"
            aria-hidden="true"
          >
            {parametre.unite}
          </span>
        </div>
        
        <div 
          id={`${parametre.id}-range`}
          className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2"
        >
          {minMaxText}
        </div>
      </div>
    </article>
  );
};

export default ParametreCard;
