import { BaseEntity } from './base.entity';
import { DateRange } from '../value-objects/date-range.vo';

export interface BlockedTimeProps {
  id: string;
  specialistId: string;
  locationId?: string;
  timeRange: DateRange;
  reason?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class BlockedTime extends BaseEntity {
  constructor(private readonly props: BlockedTimeProps) {
    super(props.id, props.createdAt, props.updatedAt);
  }

  static reconstitute(props: BlockedTimeProps): BlockedTime {
    return new BlockedTime(props);
  }

  get specialistId(): string { return this.props.specialistId; }
  get locationId(): string | undefined { return this.props.locationId; }
  get timeRange(): DateRange { return this.props.timeRange; }
  get reason(): string | undefined { return this.props.reason; }
  get isRecurring(): boolean { return this.props.isRecurring; }
  get recurrenceRule(): string | undefined { return this.props.recurrenceRule; }

  overlaps(range: DateRange): boolean {
    return this.props.timeRange.overlaps(range);
  }

  contains(date: Date): boolean {
    return this.props.timeRange.contains(date);
  }
}
