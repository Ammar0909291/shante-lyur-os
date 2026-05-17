export class Money {
  private constructor(
    private readonly _amount: number,
    private readonly _currency: string = 'RUB'
  ) {
    if (_amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
    if (!_currency || _currency.length !== 3) {
      throw new Error('Currency must be a 3-letter ISO code');
    }
  }

  static create(amount: number, currency: string = 'RUB'): Money {
    return new Money(amount, currency);
  }

  static zero(currency: string = 'RUB'): Money {
    return new Money(0, currency);
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const result = this._amount - other._amount;
    if (result < 0) {
      throw new Error('Insufficient funds');
    }
    return new Money(result, this._currency);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this._amount * factor * 100) / 100, this._currency);
  }

  percentage(percent: number): Money {
    return new Money(Math.round(this._amount * (percent / 100) * 100) / 100, this._currency);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount > other._amount;
  }

  isZero(): boolean {
    return this._amount === 0;
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  toString(): string {
    return `${this._amount.toFixed(2)} ${this._currency}`;
  }

  toJSON(): { amount: number; currency: string } {
    return { amount: this._amount, currency: this._currency };
  }

  // Compatibility shim for repository layer that uses Result-pattern style
  getValue(): Money { return this; }

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Currency mismatch: ${this._currency} vs ${other._currency}`);
    }
  }
}
