/**
 * Compile-time safety net: the enums in packages/shared (used by validation and
 * the UI) must be identical to the enums Prisma generated from schema.prisma.
 * If someone adds a value to one but not the other, `npm run typecheck` fails here.
 * This file produces no runtime code.
 */
import type * as Db from '../generated/prisma/enums';
import type * as Shared from '@crisislink/shared';

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;

export type EnumsInSync = [
  Assert<Equal<Db.CampStatus, Shared.CampStatus>>,
  Assert<Equal<Db.Gender, Shared.Gender>>,
  Assert<Equal<Db.SupplyCategory, Shared.SupplyCategory>>,
  Assert<Equal<Db.Priority, Shared.Priority>>,
  Assert<Equal<Db.NeedStatus, Shared.NeedStatus>>,
  Assert<Equal<Db.DonationStatus, Shared.DonationStatus>>,
  Assert<Equal<Db.IncidentType, Shared.IncidentType>>,
  Assert<Equal<Db.IncidentStatus, Shared.IncidentStatus>>,
];
