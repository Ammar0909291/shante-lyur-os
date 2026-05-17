export class DateRange {
  private constructor(
    private readonly _start: Date,
    private readonly _end: Date
  ) {
    if (_start >= _end) {
      throw new Error('Start date must be before end date');
    }
  }

  static create(start: Date, end: Date): DateRange {
    return new DateRange(new Date(start), new Date(end));
  }

  get start(): Date {
    return new Date(this._start);
  }

  get end(): Date {
    return new Date(this._end);
  }

  get durationMinutes(): number {
    return Math.round((this._end.getTime() - this._start.getTime()) / 60000);
  }

  get durationMs(): number {
    return this._end.getTime() - this._start.getTime();
  }

  overlaps(other: DateRange): boolean {
    return this._start < other._end && this._end > other._start;
  }

  contains(date: Date): boolean {
    return date >= this._start && date <= this._end;
  }

  containsRange(other: DateRange): boolean {
    return this._start <= other._start && this._end >= other._end;
  }

  isAdjacent(other: DateRange): boolean {
    return this._end.getTime() === other._start.getTime() ||
           this._start.getTime() === other._end.getTime();
  }

  merge(other: DateRange): DateRange {
    if (!this.overlaps(other) && !this.isAdjacent(other)) {
      throw new Error('Cannot merge non-overlapping ranges');
    }
    return new DateRange(
      this._start < other._start ? this._start : other._start,
      this._end > other._end ? this._end : other._end
    );
  }

  intersect(other: DateRange): DateRange | null {
    if (!this.overlaps(other)) return null;
    return new DateRange(
      this._start > other._start ? this._start : other._start,
      this._end < other._end ? this._end : other._end
    );
  }

  equals(other: DateRange): boolean {
    return this._start.getTime() === other._start.getTime() &&
           this._end.getTime() === other._end.getTime();
  }

  toISOStrings(): { start: string; end: string } {
    return { start: this._start.toISOString(), end: this._end.toISOString() };
  }
}
