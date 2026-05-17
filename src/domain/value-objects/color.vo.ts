const HEX_REGEX = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

export class Color {
  private constructor(private readonly _value: string) {}

  static create(value: string): Color {
    if (!HEX_REGEX.test(value)) {
      throw new Error(`Invalid hex color: ${value}`);
    }
    return new Color(value.toLowerCase());
  }

  get value(): string {
    return this._value;
  }

  get r(): number {
    return parseInt(this._value.slice(1, 3), 16);
  }

  get g(): number {
    return parseInt(this._value.slice(3, 5), 16);
  }

  get b(): number {
    return parseInt(this._value.slice(5, 7), 16);
  }

  toString(): string {
    return this._value;
  }
}
