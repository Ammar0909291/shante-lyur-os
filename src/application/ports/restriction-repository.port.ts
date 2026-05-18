export interface RestrictionData {
  id: string;
  profileId: string;
  type: 'medical' | 'pregnancy' | 'medication' | 'other';
  description: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface IRestrictionRepository {
  findByProfile(profileId: string, activeOnly?: boolean): Promise<RestrictionData[]>;
  findById(id: string): Promise<RestrictionData | null>;
  create(data: Omit<RestrictionData, 'createdAt'>): Promise<RestrictionData>;
  update(id: string, data: Partial<Pick<RestrictionData, 'description' | 'validFrom' | 'validUntil' | 'isActive'>>): Promise<RestrictionData>;
  delete(id: string): Promise<void>;
}
