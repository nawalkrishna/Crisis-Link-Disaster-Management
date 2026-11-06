/**
 * Seed script: `npm run db:seed` (also runs after `npm run db:reset`).
 *
 * 1. Districts are reference data the app needs everywhere -> always upserted.
 *    "Upsert" = insert if missing, update if present, so running it twice is safe (idempotent).
 * 2. Sample camps/needs/incidents are only for local development and are skipped
 *    when the database already has camps or NODE_ENV=production.
 * All people and phone numbers below are fictional.
 */
import { DISTRICTS } from '@crisislink/shared';
import { prisma } from '../src/db';

async function seedDistricts() {
  for (const d of DISTRICTS) {
    await prisma.district.upsert({
      where: { slug: d.slug },
      update: { name: d.name },
      create: { slug: d.slug, name: d.name },
    });
  }
  console.log(`Districts: ${DISTRICTS.length} upserted`);
}

async function seedSampleData() {
  if (process.env.NODE_ENV === 'production') return;
  if ((await prisma.reliefCamp.count()) > 0) {
    console.log('Sample data: skipped (camps already exist)');
    return;
  }

  const meppadi = await prisma.reliefCamp.create({
    data: {
      name: 'GHSS Meppadi Relief Camp',
      address: 'Govt. Higher Secondary School, Meppadi',
      district: { connect: { slug: 'wayanad' } },
      capacity: 300,
      contactName: 'Anitha K',
      contactPhone: '9400000001',
      latitude: 11.5551,
      longitude: 76.1347,
      evacuees: {
        create: [
          { fullName: 'Ramesh P', age: 54, gender: 'MALE', homeAddress: 'Chooralmala' },
          { fullName: 'Sreeja Ramesh', age: 49, gender: 'FEMALE', homeAddress: 'Chooralmala' },
          {
            fullName: 'Aadhi R',
            age: 7,
            gender: 'MALE',
            homeAddress: 'Chooralmala',
            medicalNotes: 'Asthma - needs inhaler',
          },
          { fullName: 'Fathima N', age: 71, gender: 'FEMALE', homeAddress: 'Mundakkai' },
        ],
      },
      needs: {
        create: [
          {
            item: 'Drinking water (1L bottles)',
            category: 'WATER',
            quantityNeeded: 600,
            unit: 'bottles',
            priority: 'CRITICAL',
          },
          {
            item: 'Asthma inhalers (salbutamol)',
            category: 'MEDICINE',
            quantityNeeded: 10,
            priority: 'HIGH',
          },
          {
            item: 'Blankets',
            category: 'BEDDING',
            quantityNeeded: 150,
            priority: 'MEDIUM',
            quantityFulfilled: 40,
          },
        ],
      },
    },
  });

  await prisma.reliefCamp.create({
    data: {
      name: 'St. Joseph’s Parish Hall',
      address: 'Kattappana Town, Idukki',
      district: { connect: { slug: 'idukki' } },
      capacity: 120,
      contactName: 'Fr. Thomas M',
      contactPhone: '9400000002',
      evacuees: {
        create: [
          { fullName: 'Joseph Varghese', age: 62, gender: 'MALE' },
          { fullName: 'Mary Joseph', age: 58, gender: 'FEMALE' },
        ],
      },
      needs: {
        create: [
          { item: 'Rice', category: 'FOOD', quantityNeeded: 200, unit: 'kg', priority: 'HIGH' },
          {
            item: 'Sanitary pads',
            category: 'HYGIENE',
            quantityNeeded: 100,
            unit: 'packs',
            priority: 'HIGH',
          },
        ],
      },
    },
  });

  await prisma.reliefCamp.create({
    data: {
      name: 'Kuttanad Community Hall',
      address: 'Ramankary, Kuttanad',
      district: { connect: { slug: 'alappuzha' } },
      capacity: 80,
      status: 'OPEN',
      needs: {
        create: [
          {
            item: 'Children’s clothing',
            category: 'CLOTHING',
            quantityNeeded: 60,
            priority: 'LOW',
          },
        ],
      },
    },
  });

  await prisma.incidentReport.createMany({
    data: [
      {
        type: 'LANDSLIDE',
        severity: 'CRITICAL',
        status: 'VERIFIED',
        description: 'Major landslide, houses buried, road to Mundakkai cut off.',
        locationText: 'Mundakkai, Meppadi',
        districtId: (await districtId('wayanad'))!,
        latitude: 11.4853,
        longitude: 76.1647,
      },
      {
        type: 'FLOOD',
        severity: 'HIGH',
        description: 'Water level rising quickly near the river bank, families on rooftops.',
        locationText: 'Ramankary, Kuttanad',
        districtId: (await districtId('alappuzha'))!,
      },
      {
        type: 'ROAD_BLOCKED',
        severity: 'MEDIUM',
        description: 'Fallen trees blocking the ghat road.',
        locationText: 'Kuttikkanam - Kattappana road',
        districtId: (await districtId('idukki'))!,
      },
    ],
  });

  const water = await prisma.campNeed.findFirstOrThrow({
    where: { campId: meppadi.id, category: 'WATER' },
  });
  await prisma.donation.createMany({
    data: [
      {
        donorName: 'Kerala Traders Association',
        category: 'WATER',
        item: 'Drinking water',
        quantity: 200,
        needId: water.id,
        campId: meppadi.id,
      },
      {
        donorName: 'Anonymous',
        category: 'FOOD',
        item: 'Biscuits',
        quantity: 50,
        campId: meppadi.id,
      },
    ],
  });

  console.log('Sample data: 3 camps, 6 evacuees, 6 needs, 3 incidents, 2 donations');
}

async function districtId(slug: string) {
  return (await prisma.district.findUnique({ where: { slug } }))?.id;
}

try {
  await seedDistricts();
  await seedSampleData();
} finally {
  await prisma.$disconnect();
}
