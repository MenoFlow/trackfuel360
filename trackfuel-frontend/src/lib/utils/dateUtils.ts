// Utilitaires pour la gestion du temps
// Utilise une date simulée fixe pour des résultats cohérents et testables

// Date simulée fixe pour les tests et le développement (peut être configurée)
const SIMULATED_DATE = new Date('2025-10-09T12:00:00Z');

/**
 * Retourne la date actuelle (simulée ou réelle)
 */
export function getCurrentDate(): Date {
  // En production, on pourrait utiliser new Date()
  // Pour le développement, on utilise une date fixe pour la cohérence
  return new Date(SIMULATED_DATE);
}

/**
 * Calcule le début du mois actuel
 */
export function getStartOfCurrentMonth(): Date {
  const now = getCurrentDate();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Calcule une date N jours avant la date actuelle
 */
export function getDaysAgo(days: number): Date {
  const date = getCurrentDate();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Calcule la différence en heures entre deux dates
 */
export function getDifferenceInHours(date1: Date, date2: Date): number {
  return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);
}

/**
 * Vérifie si une date est dans une période donnée
 */
export function isDateInPeriod(date: Date, startDate: Date, endDate?: Date): boolean {
  const dateTime = date.getTime();
  const startTime = startDate.getTime();
  
  if (endDate) {
    return dateTime >= startTime && dateTime <= endDate.getTime();
  }
  
  return dateTime >= startTime;
}
