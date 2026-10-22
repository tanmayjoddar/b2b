import { PrismaClient, Role, VerificationTier, FactoryStatus, BriefStatus, QuoteRequestStatus, QuoteStatus, OrderStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding FactoryMatch database...');

  // 1. Launch Vertical
  const vertical = await prisma.vertical.upsert({
    where: { slug: 'snacks-nutrition' },
    update: {},
    create: {
      id: 'snack-nutrition-v1',
      name: 'Snacks & Nutrition',
      slug: 'snacks-nutrition',
      attributeSchemaJson: {
        categories: ['Nutrition Bars', 'Protein Cookies', 'Extruded Snacks'],
        minShelfLifeMonths: 6,
      },
    },
  });
  console.log(`Vertical ready: ${vertical.name}`);

  // 2. Admin User
  const adminPasswordHash = await argon2.hash('Admin@123456');
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@factorymatch.in' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'admin@factorymatch.in',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Admin user: ${adminUser.email}`);

  // 3. Brand User & Brand Profile
  const brandPasswordHash = await argon2.hash('Brand@123456');
  const brandUser = await prisma.user.upsert({
    where: { email: 'founder@proteinbites.in' },
    update: { passwordHash: brandPasswordHash },
    create: {
      email: 'founder@proteinbites.in',
      passwordHash: brandPasswordHash,
      role: Role.BRAND,
      brand: {
        create: {
          companyName: 'ProteinBites Nutrition Pvt Ltd',
          gstNo: '27AABCP1234A1Z5',
          website: 'https://proteinbites.in',
        },
      },
    },
    include: { brand: true },
  });
  const brandId = brandUser.brand!.id;
  console.log(`Brand user: ${brandUser.email} (Brand ID: ${brandId})`);

  // 4. Factory 1: Apex Foodtech Industries (Mumbai, MH)
  const factoryUser1 = await prisma.user.upsert({
    where: { phone: '+919876543210' },
    update: {},
    create: {
      phone: '+919876543210',
      role: Role.FACTORY,
    },
  });

  const factory1 = await prisma.factory.upsert({
    where: { id: 'factory-apex-mumbai' },
    update: {},
    create: {
      id: 'factory-apex-mumbai',
      ownerUserId: factoryUser1.id,
      legalName: 'Apex Foodtech Industries Private Limited',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      pincode: '400705',
      lat: 19.076,
      lng: 73.012,
      tier: VerificationTier.TIER_2_VIDEO,
      status: FactoryStatus.ACTIVE,
      capacityNotes: 'FSSAI Central FoSCoS valid till 2028. Temperature controlled packaging unit.',
      leadTimeDaysMin: 14,
      leadTimeDaysMax: 28,
    },
  });
  console.log(`Factory 1: ${factory1.legalName}`);

  // 5. Factory 2: PureBites Nutra Labs (Pune, MH)
  const factoryUser2 = await prisma.user.upsert({
    where: { phone: '+919123456789' },
    update: {},
    create: {
      phone: '+919123456789',
      role: Role.FACTORY,
    },
  });

  const factory2 = await prisma.factory.upsert({
    where: { id: 'factory-purebites-pune' },
    update: {},
    create: {
      id: 'factory-purebites-pune',
      ownerUserId: factoryUser2.id,
      legalName: 'PureBites Nutra Labs LLP',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '410501',
      lat: 18.756,
      lng: 73.856,
      tier: VerificationTier.TIER_3_PROVEN,
      status: FactoryStatus.ACTIVE,
      capacityNotes: 'ISO 22000 & HACCP Certified. Nitrogen flush flow-wrapping line.',
      leadTimeDaysMin: 18,
      leadTimeDaysMax: 35,
    },
  });
  console.log(`Factory 2: ${factory2.legalName}`);

  // Link Factory to Vertical
  await prisma.factoryVertical.createMany({
    data: [
      { factoryId: factory1.id, verticalId: vertical.id },
      { factoryId: factory2.id, verticalId: vertical.id },
    ],
    skipDuplicates: true,
  });

  // Factory Capabilities
  await prisma.factoryCapability.createMany({
    data: [
      {
        factoryId: factory1.id,
        verticalId: vertical.id,
        productType: 'Cold-pressed Extrusion Bars',
        capacityUnitsPerMonth: 150000,
        moqUnits: 5000,
        packagingOptions: ['Flow Wrap', 'Display Box', 'Master Carton'],
      },
      {
        factoryId: factory2.id,
        verticalId: vertical.id,
        productType: 'Protein Bar Forming Line',
        capacityUnitsPerMonth: 300000,
        moqUnits: 10000,
        packagingOptions: ['Nitrogen Flush Wrap', 'Retail Pack'],
      },
    ],
    skipDuplicates: true,
  });

  // 6. Create Real Brief for Brand
  const brief = await prisma.brief.upsert({
    where: { id: 'brief-seed-protein-bar' },
    update: {},
    create: {
      id: 'brief-seed-protein-bar',
      brandId: brandId,
      verticalId: vertical.id,
      productName: 'High Protein Peanut Butter Crisp Bar',
      quantityUnits: 25000,
      targetPricePaiseMin: 4000, // Rs 40.00
      targetPricePaiseMax: 4800, // Rs 48.00
      timelineWeeks: 4,
      status: BriefStatus.QUOTING,
      requirementsJson: {
        category: 'Nutrition Bars',
        proteinContent: '15g per bar',
        shelfLifeMonths: 9,
        packagingType: 'Metallic foil flow wrap',
        dietary: 'Gluten-Free, No Added Sugar',
      },
    },
  });
  console.log(`Brief created: ${brief.productName}`);

  // 7. Shortlist & Shortlist Items
  const existingShortlist = await prisma.shortlist.findFirst({
    where: { briefId: brief.id },
  });
  if (!existingShortlist) {
    await prisma.shortlist.create({
      data: {
        briefId: brief.id,
        createdByAdminId: adminUser.id,
        items: {
          create: [
            { factoryId: factory1.id, rank: 1, adminNote: 'Excellent bar extrusion line and cleanroom packaging.' },
            { factoryId: factory2.id, rank: 2, adminNote: 'Proven track record with high volume protein bars.' },
          ],
        },
      },
    });
  }

  // 8. Quote Requests & Real Quotes
  const qr1 = await prisma.quoteRequest.upsert({
    where: { briefId_factoryId: { briefId: brief.id, factoryId: factory1.id } },
    update: {},
    create: {
      briefId: brief.id,
      factoryId: factory1.id,
      status: QuoteRequestStatus.QUOTED,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });

  const quote1 = await prisma.quote.upsert({
    where: { id: 'quote-seed-apex-1' },
    update: {},
    create: {
      id: 'quote-seed-apex-1',
      quoteRequestId: qr1.id,
      pricePaisePerUnit: 4200, // Rs 42.00
      moqUnits: 10000,
      leadTimeDays: 21,
      validUntil: new Date(Date.now() + 14 * 86400000),
      status: QuoteStatus.ACCEPTED,
      termsJson: {
        paymentTerms: '50% advance escrow, 50% on dispatch',
        sampleTurnaroundDays: 5,
      },
    },
  });

  const qr2 = await prisma.quoteRequest.upsert({
    where: { briefId_factoryId: { briefId: brief.id, factoryId: factory2.id } },
    update: {},
    create: {
      briefId: brief.id,
      factoryId: factory2.id,
      status: QuoteRequestStatus.QUOTED,
      expiresAt: new Date(Date.now() + 7 * 86400000),
    },
  });

  await prisma.quote.upsert({
    where: { id: 'quote-seed-purebites-2' },
    update: {},
    create: {
      id: 'quote-seed-purebites-2',
      quoteRequestId: qr2.id,
      pricePaisePerUnit: 4450, // Rs 44.50
      moqUnits: 15000,
      leadTimeDays: 18,
      validUntil: new Date(Date.now() + 14 * 86400000),
      status: QuoteStatus.SUBMITTED,
      termsJson: {
        paymentTerms: '50% advance escrow, 50% post-QA',
        sampleTurnaroundDays: 7,
      },
    },
  });

  // 9. Real Production Order
  const order = await prisma.order.upsert({
    where: { id: 'order-seed-batch-101' },
    update: {},
    create: {
      id: 'order-seed-batch-101',
      brandId: brandId,
      factoryId: factory1.id,
      quoteId: quote1.id,
      status: OrderStatus.CONFIRMED,
      totalPaise: 25000 * 4200, // 25,000 * Rs 42 = Rs 10,50,000 (105000000 paise)
      quantityUnits: 25000,
      events: {
        create: [
          {
            fromStatus: OrderStatus.CONFIRMED,
            toStatus: OrderStatus.CONFIRMED,
            actorUserId: brandUser.id,
            reason: 'Production order confirmed following quote acceptance.',
          },
        ],
      },
    },
  });
  console.log(`Order created: ${order.id}`);

  // 10. Audit Log
  await prisma.auditLog.create({
    data: {
      actorUserId: adminUser.id,
      action: 'SYSTEM_INITIALIZED',
      entityType: 'System',
      entityId: 'seed-01',
      afterJson: { initializedAt: new Date().toISOString() },
    },
  });

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
