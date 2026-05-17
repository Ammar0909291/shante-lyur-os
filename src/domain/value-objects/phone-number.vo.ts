const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export class PhoneNumber {
  private constructor(private readonly _value: string) {}

  static create(value: string): PhoneNumber {
    const digits = value.replace(/\D/g, '');
    const normalized = digits.startsWith('7') && digits.length === 11
      ? `+${digits}`
      : digits.startsWith('8') && digits.length === 11
      ? `+7${digits.slice(1)}`
      : `+${digits}`;

    if (!PHONE_REGEX.test(normalized)) {
      throw new Error(`Invalid phone number: ${value}`);
    }
    return new PhoneNumber(normalized);
  }

  get value(): string {
    return this._value;
  }

  get formatted(): string {
    const m = this._value.match(/^\+(\d)(\d{3})(\d{3})(\d{2})(\d{2})$/);
    if (!m) return this._value;
    return `+${m[1]} (${m[2]}) ${m[3]}-${m[4]}-${m[5]}`;
  }

  equals(other: PhoneNumber): boolean {
    return this._value === other._value;
  }

  getValue(): PhoneNumber { return this; }

  toString(): string {
    return this._value;
  }
}
