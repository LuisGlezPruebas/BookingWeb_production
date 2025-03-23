/**
 * Format a date string to DD/MM/YYYY format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

/**
 * Calculate the number of days between two dates
 */
export function calculateNights(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is in the past
 */
export function isPastDate(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateString);
  return date < today;
}

/**
 * Get the first day of the month (0-6, where 0 is Sunday)
 */
export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * Get the number of days in a month
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Format a date to ISO string format (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Generate an array of available years for reservations
 * Initially showing 2025-2028, and then adding future years automatically as time passes
 */
export function getAvailableYears(): string[] {
  const currentYear = new Date().getFullYear();
  const startYear = 2025; // Año inicial fijo
  const yearsToShow = 4; // Mostrar 4 años por delante
  
  // Calculamos el año final basándonos en el año actual
  const maxYear = Math.max(startYear + yearsToShow - 1, currentYear + yearsToShow - 1);
  
  // Generamos el array de años disponibles
  const years: string[] = [];
  for (let year = startYear; year <= maxYear; year++) {
    years.push(year.toString());
  }
  
  return years;
}
