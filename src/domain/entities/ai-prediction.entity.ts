import { BaseEntity } from './base.entity';

export interface AIPredictionProps {
  id: string;
  modelType: string;
  entityType: string;
  entityId?: string;
  prediction: Record<string, unknown>;
  confidence?: number;
  actualOutcome?: Record<string, unknown>;
  accuracyDelta?: number;
  trainedAt: Date;
  createdAt: Date;
}

export class AIPrediction extends BaseEntity {
  static reconstitute(props: AIPredictionProps): AIPrediction {
    return new AIPrediction(props);
  }

  static create(props: {
    type?: string;
    modelType?: string;
    entityType?: string;
    entityId?: string;
    prediction: number | Record<string, unknown>;
    confidence?: number;
    features?: unknown;
    modelVersion?: string;
  }): AIPrediction {
    return new AIPrediction({
      id: crypto.randomUUID(),
      modelType: props.type ?? props.modelType ?? 'default',
      entityType: props.entityType ?? 'default',
      entityId: props.entityId,
      prediction: typeof props.prediction === 'number' ? { value: props.prediction } : (props.prediction as Record<string, unknown>),
      confidence: props.confidence,
      trainedAt: new Date(),
      createdAt: new Date(),
    });
  }

  constructor(private readonly props: AIPredictionProps) {
    super(props.id, props.createdAt, props.createdAt);
  }

  get modelType(): string { return this.props.modelType; }
  get entityType(): string { return this.props.entityType; }
  get entityId(): string | undefined { return this.props.entityId; }
  get prediction(): Record<string, unknown> { return this.props.prediction; }
  get confidence(): number | undefined { return this.props.confidence; }
  get actualOutcome(): Record<string, unknown> | undefined { return this.props.actualOutcome; }
  get accuracyDelta(): number | undefined { return this.props.accuracyDelta; }
  get trainedAt(): Date { return this.props.trainedAt; }

  recordActualOutcome(outcome: Record<string, unknown>): void {
    this.props.actualOutcome = outcome;
    if (this.props.prediction && this.props.confidence) {
      // Simple accuracy calculation placeholder
      this.props.accuracyDelta = this.props.confidence; // refined by actual comparison
    }
    this.updatedAt = new Date();
  }
}
