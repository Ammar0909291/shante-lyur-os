import { PrismaClient } from '@prisma/client';
import { IClientPackageRepository } from '@/application/ports';
import { ClientPackage } from '@/domain/entities';
import { ClientPackageStatus } from '@/domain/enums';

function toDomain(raw: {
  id: string;
  profileId: string;
  name: string;
  serviceId: string | null;
  totalSessions: number;
  usedSessions: number;
  priceTotal: any;
  purchasedAt: Date;
  expiresAt: Date | null;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): ClientPackage {
  return new ClientPackage({
    id: raw.id,
    profileId: raw.profileId,
    name: raw.name,
    serviceId: raw.serviceId ?? undefined,
    totalSessions: raw.totalSessions,
    usedSessions: raw.usedSessions,
    priceTotal: Number(raw.priceTotal),
    purchasedAt: raw.purchasedAt,
    expiresAt: raw.expiresAt ?? undefined,
    status: raw.status as ClientPackageStatus,
    notes: raw.notes ?? undefined,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  });
}

export class PrismaClientPackageRepository implements IClientPackageRepository {
  constructor(private readonly db: PrismaClient) {}

  async findById(id: string): Promise<ClientPackage | null> {
    const raw = await this.db.clientPackage.findUnique({ where: { id } });
    return raw ? toDomain(raw) : null;
  }

  async findByProfileId(profileId: string): Promise<ClientPackage[]> {
    const raws = await this.db.clientPackage.findMany({
      where: { profileId },
      orderBy: { purchasedAt: 'desc' },
    });
    return raws.map(toDomain);
  }

  async findActiveByProfileId(profileId: string): Promise<ClientPackage[]> {
    const raws = await this.db.clientPackage.findMany({
      where: { profileId, status: 'ACTIVE' },
      orderBy: { purchasedAt: 'desc' },
    });
    return raws.map(toDomain);
  }

  async create(pkg: ClientPackage): Promise<ClientPackage> {
    const raw = await this.db.clientPackage.create({
      data: {
        id: pkg.id,
        profileId: pkg.profileId,
        name: pkg.name,
        serviceId: pkg.serviceId,
        totalSessions: pkg.totalSessions,
        usedSessions: pkg.usedSessions,
        priceTotal: pkg.priceTotal,
        purchasedAt: pkg.purchasedAt,
        expiresAt: pkg.expiresAt,
        status: pkg.status,
        notes: pkg.notes,
      },
    });
    return toDomain(raw);
  }

  async update(pkg: ClientPackage): Promise<ClientPackage> {
    const raw = await this.db.clientPackage.update({
      where: { id: pkg.id },
      data: {
        usedSessions: pkg.usedSessions,
        status: pkg.status,
        notes: pkg.notes,
        updatedAt: new Date(),
      },
    });
    return toDomain(raw);
  }
}
