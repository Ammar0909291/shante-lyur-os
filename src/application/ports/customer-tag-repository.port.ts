export interface CustomerTagRecord {
  id: string;
  profileId: string;
  tag: string;
  color: string | null;
  createdAt: Date;
}

export interface ICustomerTagRepository {
  findByProfile(profileId: string): Promise<CustomerTagRecord[]>;
  create(data: { profileId: string; tag: string; color?: string }): Promise<CustomerTagRecord>;
  delete(profileId: string, tag: string): Promise<void>;
}
