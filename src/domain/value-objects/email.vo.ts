const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export class Email {
  private constructor(private readonly _value: string) {}

  static create(value: string): Email {
    const normalized = value.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalized)) {
      throw new Error(`Invalid email format: ${value}`);
    }
    return new Email(normalized);
  }

  get value(): string {
    return this._value;
  }

  get domain(): string {
    return this._value.split('@')[1];
  }

  equals(other: Email): boolean {
    return this._value === other._value;
  }

  getValue(): Email { return this; }

  toString(): string {
    return this._value;
  }
}
