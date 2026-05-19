export interface CustomerRestrictionRecord {
  id: string;
  profileId: string;
  type: string;
  description: string;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ICustomerRestrictionRepository {
  findByProfile(profileId: string, onlyActive?: boolean): Promise<CustomerRestrictionRecord[]>;
  create(data: {
    profileId: string;
    type: string;
    description: string;
    validFrom?: Date;
    validUntil?: Date;
  }): Promise<CustomerRestrictionRecord>;
  deactivate(id: string): Promise<void>;
}
