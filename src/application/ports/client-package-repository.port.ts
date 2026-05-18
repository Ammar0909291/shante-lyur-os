import { ClientPackage } from '@/domain/entities';

export interface IClientPackageRepository {
  findById(id: string): Promise<ClientPackage | null>;
  findByProfileId(profileId: string): Promise<ClientPackage[]>;
  findActiveByProfileId(profileId: string): Promise<ClientPackage[]>;
  create(pkg: ClientPackage): Promise<ClientPackage>;
  update(pkg: ClientPackage): Promise<ClientPackage>;
}
