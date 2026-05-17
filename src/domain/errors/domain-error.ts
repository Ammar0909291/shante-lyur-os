export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  toJSON(): {
    error: string;
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  } {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
