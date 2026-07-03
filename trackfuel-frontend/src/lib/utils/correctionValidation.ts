import { Correction, Plein, Vehicule } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  errors: string[];
  score: number; // 0-100
}

/**
 * Valide une correction de plein en vérifiant :
 * - Capacité réservoir
 * - Odomètre non décroissant
 * - Consommation vs moyenne
 */
export function validateCorrectionPlein(
  correction: Correction,
  plein: Plein,
  vehicule: Vehicule,
  previousPleins: Plein[]
): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let score = 100;

  const newValue = correction.new_value as number;
  const oldValue = correction.old_value as number;

  console.log(222);
  // Validation selon le champ corrigé
  if (correction.champ === 'litres') {
    // Vérifier capacité réservoir
    if (newValue > vehicule.capacite_reservoir) {
      errors.push(`Quantité (${newValue}L) dépasse la capacité du réservoir (${vehicule.capacite_reservoir}L)`);
      score -= 50;
    } else if (newValue > vehicule.capacite_reservoir * 0.95) {
      warnings.push(`Quantité très proche de la capacité maximale (${vehicule.capacite_reservoir}L)`);
      score -= 10;
    }

    // Vérifier écart important
    const ecartPct = Math.abs(newValue - oldValue) / oldValue * 100;
    if (ecartPct > 20) {
      warnings.push(`Écart de ${ecartPct.toFixed(1)}% par rapport à la valeur initiale`);
      score -= 15;
    }
  }

  if (correction.champ === 'odometre') {
    // Vérifier odomètre non décroissant
    const latestPlein = previousPleins
      .filter(p => p.id !== plein.id && new Date(p.date) < new Date(plein.date))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (latestPlein && newValue < latestPlein.odometre) {
      errors.push(`Odomètre (${newValue} km) inférieur au plein précédent (${latestPlein.odometre} km)`);
      score -= 50;
    }

    // Vérifier saut important
    if (latestPlein) {
      const distance = newValue - latestPlein.odometre;
      if (distance > 1000) {
        warnings.push(`Distance importante depuis le dernier plein (${distance} km)`);
        score -= 10;
      }
    }
  }

  // Calculer consommation si on a assez de données
  if (correction.champ === 'litres' || correction.champ === 'odometre') {
    const consommationEstimee = calculateEstimatedConsumption(plein, previousPleins, correction);
    if (consommationEstimee) {
      const ecartVsNominale = Math.abs(consommationEstimee - vehicule.consommation_nominale) / vehicule.consommation_nominale * 100;
      
      if (ecartVsNominale > 100) {
        errors.push(`Consommation estimée (${consommationEstimee.toFixed(1)} L/100km) très éloignée de la nominale (${vehicule.consommation_nominale} L/100km)`);
        score -= 30;
      } else if (ecartVsNominale > 50) {
        warnings.push(`Consommation estimée (${consommationEstimee.toFixed(1)} L/100km) éloignée de la nominale (${vehicule.consommation_nominale} L/100km)`);
        score -= 20;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
    score: Math.max(0, score)
  };
}

function calculateEstimatedConsumption(
  plein: Plein,
  previousPleins: Plein[],
  correction: Correction
): number | null {
  const latestPlein = previousPleins
    .filter(p => p.id !== plein.id && new Date(p.date) < new Date(plein.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (!latestPlein) return null;

  const litres = correction.champ === 'litres' ? correction.new_value as number : plein.litres;
  const odometre = correction.champ === 'odometre' ? correction.new_value as number : plein.odometre;
  
  const distance = odometre - latestPlein.odometre;
  if (distance <= 0) return null;

  return (litres / distance) * 100;
}

/**
 * Calcule la moyenne de consommation sur les N derniers jours
 */
export function calculateAverageConsumption(
  vehicule: Vehicule,
  pleins: Plein[],
  days: number = 90
): number | null {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const recentPleins = pleins
    .filter(p => p.vehicule_id === vehicule.id && new Date(p.date) > cutoffDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (recentPleins.length < 2) return null;

  const consumptions: number[] = [];
  for (let i = 1; i < recentPleins.length; i++) {
    const distance = recentPleins[i].odometre - recentPleins[i - 1].odometre;
    if (distance > 0) {
      const consumption = (recentPleins[i].litres / distance) * 100;
      consumptions.push(consumption);
    }
  }

  if (consumptions.length === 0) return null;
  return consumptions.reduce((a, b) => a + b, 0) / consumptions.length;
}
