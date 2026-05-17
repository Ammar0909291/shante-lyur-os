export abstract class BaseEntity {
  protected constructor(
    public readonly id: string,
    public readonly createdAt: Date,
    public updatedAt: Date
  ) {}

  equals(other: BaseEntity): boolean {
    if (this.constructor !== other.constructor) return false;
    return this.id === other.id;
  }

  hashCode(): string {
    return `${this.constructor.name}#${this.id}`;
  }
}
