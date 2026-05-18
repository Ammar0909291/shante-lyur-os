export interface AllergyData {
  id: string;
  profileId: string;
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction?: string | null;
  diagnosedAt?: Date | null;
  createdAt: Date;
}

export interface IAllergyRepository {
  findByProfile(profileId: string): Promise<AllergyData[]>;
  findById(id: string): Promise<AllergyData | null>;
  create(data: Omit<AllergyData, 'createdAt'>): Promise<AllergyData>;
  delete(id: string): Promise<void>;
}
