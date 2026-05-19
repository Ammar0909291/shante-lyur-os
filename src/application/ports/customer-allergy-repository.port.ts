export interface CustomerAllergyRecord {
  id: string;
  profileId: string;
  allergen: string;
  severity: string;
  reaction: string | null;
  diagnosedAt: Date | null;
  createdAt: Date;
}

export interface ICustomerAllergyRepository {
  findByProfile(profileId: string): Promise<CustomerAllergyRecord[]>;
  create(data: {
    profileId: string;
    allergen: string;
    severity: string;
    reaction?: string;
    diagnosedAt?: Date;
  }): Promise<CustomerAllergyRecord>;
  delete(id: string): Promise<void>;
}
