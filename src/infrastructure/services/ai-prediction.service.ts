import { v4 as uuidv4 } from 'uuid';
import { AIPredictionServicePort } from '@/application/ports/ai-prediction-service.port';
import { AppointmentRepositoryPort } from '@/application/ports/appointment-repository.port';
import { RevenueRecordRepositoryPort } from '@/application/ports/revenue-record-repository.port';
import { AIPredictionRepositoryPort } from '@/application/ports/ai-prediction-repository.port';
import { AIPrediction } from '@/domain/entities/ai-prediction.entity';
import { AppointmentStatus } from '@/domain/enums/appointment-status.enum';

export class AIPredictionService implements AIPredictionServicePort {
  constructor(
    private readonly appointmentRepo: AppointmentRepositoryPort,
    private readonly revenueRepo: RevenueRecordRepositoryPort,
    private readonly aiRepo: AIPredictionRepositoryPort,
  ) {}

  async predictNoShow(customerId: string): Promise<{ probability: number; factors: string[] }> {
    const history = await this.appointmentRepo.findMany({ clientId: customerId, limit: 100 });
    const total = history.total;
    if (total === 0) return { probability: 0.1, factors: ['Новый клиент'] };

    const noShows = history.items.filter(a => a.status === AppointmentStatus.NO_SHOW).length;
    const cancelled = history.items.filter(a => a.status === AppointmentStatus.CANCELLED).length;
    const noShowRate = total > 0 ? noShows / total : 0;
    const cancelRate = total > 0 ? cancelled / total : 0;

    let probability = 0.05;
    const factors: string[] = [];

    if (noShowRate > 0.3) { probability += 0.3; factors.push('Высокий процент неявок'); }
    if (cancelRate > 0.4) { probability += 0.2; factors.push('Частые отмены'); }
    if (total < 3) { probability += 0.1; factors.push('Мало посещений'); }

    probability = Math.min(probability, 0.95);

    const prediction = new AIPrediction({
      id: uuidv4(),
      modelType: 'no-show',
      entityType: 'customer',
      entityId: customerId,
      prediction: { probability, noShowRate, cancelRate },
      confidence: 0.7,
      trainedAt: new Date(),
      createdAt: new Date(),
    });
    await this.aiRepo.create(prediction);

    return { probability, factors };
  }

  async forecastRevenue(days: number): Promise<{ date: string; predictedRevenue: number; confidence: number }[]> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    const history = await this.revenueRepo.findMany({ from: start, to: end, limit: 200 });
    const avgDaily = history.items.length > 0
      ? history.items.reduce((sum, h) => sum + h.amount.amount, 0) / history.items.length
      : 0;

    const results: { date: string; predictedRevenue: number; confidence: number }[] = [];
    for (let i = 1; i <= days; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dayOfWeek = date.getDay();
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1.0;
      results.push({
        date: date.toISOString().split('T')[0],
        predictedRevenue: Math.round(avgDaily * weekendMultiplier),
        confidence: 0.6,
      });
    }

    return results;
  }

  async recommendSlots(_specialistId: string, _date: Date): Promise<{ startTime: string; score: number; reason: string }[]> {
    return [
      { startTime: '10:00', score: 0.9, reason: 'Пиковое время' },
      { startTime: '14:00', score: 0.7, reason: 'Средняя загрузка' },
      { startTime: '16:00', score: 0.8, reason: 'Высокий спрос' },
    ];
  }
}
