import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OcrCompareData {
  ocrText: string;
  manualValue: string;
  field: string;
  confidence?: number;
  photoUrl?: string;
}

interface OcrCompareProps {
  data: OcrCompareData;
}

export const OcrCompare: React.FC<OcrCompareProps> = ({ data }) => {
  const isMatch = data.ocrText.trim() === data.manualValue.trim();
  const confidence = data.confidence || 0;

  // Highlight differences between OCR and manual
  const getDiffHighlight = (text: string, reference: string, isReference: boolean) => {
    if (isMatch) return text;
    
    // Simple character-by-character comparison
    return text.split('').map((char, i) => {
      const isEqual = reference[i] === char;
      return (
        <span
          key={i}
          className={cn(
            !isEqual && !isReference && "bg-destructive/20 text-destructive font-semibold",
            !isEqual && isReference && "bg-accent/20 text-accent font-semibold"
          )}
        >
          {char}
        </span>
      );
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/30">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="h-5 w-5" />
          Comparaison OCR
          {isMatch ? (
            <Badge variant="default" className="ml-auto">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Correspond
            </Badge>
          ) : (
            <Badge variant="destructive" className="ml-auto">
              <AlertCircle className="h-3 w-3 mr-1" />
              Différence
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Confidence Score */}
        {confidence > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Confiance OCR</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all",
                    confidence >= 80 ? "bg-green-500" : confidence >= 60 ? "bg-yellow-500" : "bg-destructive"
                  )}
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className="text-sm font-semibold">{confidence}%</span>
            </div>
          </div>
        )}

        {/* OCR Result */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Texte OCR détecté</span>
            <Badge variant="secondary">Auto</Badge>
          </div>
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="font-mono text-lg">
              {getDiffHighlight(data.ocrText, data.manualValue, true)}
            </p>
          </div>
        </div>

        {/* Manual Entry */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Saisie manuelle</span>
            <Badge variant="outline">Manuel</Badge>
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="font-mono text-lg">
              {getDiffHighlight(data.manualValue, data.ocrText, false)}
            </p>
          </div>
        </div>

        {/* Field Name */}
        <div className="pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            Champ: <span className="font-semibold">{data.field}</span>
          </span>
        </div>

        {/* Mock Photo Preview */}
        {data.photoUrl && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-muted-foreground">Photo du bon</span>
            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              <img 
                src={data.photoUrl} 
                alt="Bon de plein" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '<div class="text-muted-foreground"><Camera class="h-12 w-12 mx-auto mb-2 opacity-50" /><p class="text-sm">Photo non disponible</p></div>';
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
