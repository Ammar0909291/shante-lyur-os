export interface AIPredictionServicePort {
  predictNoShow(
    customerId: string,
  ): Promise<{ probability: number; factors: string[] }>;

  forecastRevenue(
    days: number,
  ): Promise<{ date: string; predictedRevenue: number; confidence: number }[]>;

  recommendSlots(
    specialistId: string,
    date: Date,
  ): Promise<{ startTime: string; score: number; reason: string }[]>;
}
