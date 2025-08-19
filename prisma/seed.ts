import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Create organizations
  const org1 = await prisma.organization.upsert({
    where: { id: "seed-org" },
    update: {},
    create: { id: "seed-org", name: "Kas RT 01" }
  });

  const org2 = await prisma.organization.upsert({
    where: { id: "seed-org-2" },
    update: {},
    create: { id: "seed-org-2", name: "Kas Gereja" }
  });

  const org3 = await prisma.organization.upsert({
    where: { id: "seed-org-3" },
    update: {},
    create: { id: "seed-org-3", name: "Kas Komunitas" }
  });

  const org4 = await prisma.organization.upsert({
    where: { id: "kas-imus" },
    update: {},
    create: { id: "kas-imus", name: "Kas Imus" }
  });

  // Create test user
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      email: "test@example.com",
      name: "Test User",
      emailVerified: new Date()
    }
  });

  // Create billyfebram user
  const billyUser = await prisma.user.upsert({
    where: { email: "billyfebram@gmail.com" },
    update: {},
    create: {
      email: "billyfebram@gmail.com",
      name: "Billy Febram",
      emailVerified: new Date()
    }
  });

  // Create memberships for the user
  await prisma.membership.upsert({
    where: { 
      userId_organizationId: {
        userId: user.id,
        organizationId: org1.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org1.id,
      role: "ADMIN"
    }
  });

  await prisma.membership.upsert({
    where: { 
      userId_organizationId: {
        userId: user.id,
        organizationId: org2.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org2.id,
      role: "TREASURER"
    }
  });

  await prisma.membership.upsert({
    where: { 
      userId_organizationId: {
        userId: user.id,
        organizationId: org3.id
      }
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org3.id,
      role: "VIEWER"
    }
  });

  // Create membership for Billy in Kas Imus
  await prisma.membership.upsert({
    where: { 
      userId_organizationId: {
        userId: billyUser.id,
        organizationId: org4.id
      }
    },
    update: {},
    create: {
      userId: billyUser.id,
      organizationId: org4.id,
      role: "ADMIN"
    }
  });

  // Create dues configs for organizations
  await prisma.duesConfig.upsert({
    where: { id: "seed-config" },
    update: { amount: 50000 },
    create: { id: "seed-config", organizationId: org1.id, amount: 50000 }
  });

  await prisma.duesConfig.upsert({
    where: { id: "seed-config-2" },
    update: { amount: 75000 },
    create: { id: "seed-config-2", organizationId: org2.id, amount: 75000 }
  });

  await prisma.duesConfig.upsert({
    where: { id: "seed-config-3" },
    update: { amount: 30000 },
    create: { id: "seed-config-3", organizationId: org3.id, amount: 30000 }
  });

  await prisma.duesConfig.upsert({
    where: { id: "seed-config-4" },
    update: { amount: 100000 },
    create: { id: "seed-config-4", organizationId: org4.id, amount: 100000 }
  });

  const members = await Promise.all([
    prisma.member.upsert({
      where: { id: "member-1" },
      update: {},
      create: { id: "member-1", organizationId: org1.id, fullName: "Andi Saputra", email: "andi@example.com", phone: "6281111111111" }
    }),
    prisma.member.upsert({
      where: { id: "member-2" },
      update: {},
      create: { id: "member-2", organizationId: org1.id, fullName: "Budi Santoso", email: "budi@example.com", phone: "6281222222222" }
    }),
    prisma.member.upsert({
      where: { id: "member-3" },
      update: {},
      create: { id: "member-3", organizationId: org1.id, fullName: "Citra Dewi", email: "citra@example.com", phone: "6281333333333" }
    }),
    prisma.member.upsert({
      where: { id: "member-4" },
      update: {},
      create: { id: "member-4", organizationId: org1.id, fullName: "Dedi Rahman", email: "dedi@example.com", phone: "6281444444444" }
    }),
    prisma.member.upsert({
      where: { id: "member-5" },
      update: {},
      create: { id: "member-5", organizationId: org1.id, fullName: "Eka Sari", email: "eka@example.com", phone: "6281555555555" }
    }),
    // Members for Kas Imus (org4)
    prisma.member.upsert({
      where: { id: "member-imus-1" },
      update: {},
      create: { id: "member-imus-1", organizationId: org4.id, fullName: "Ahmad Rizki", email: "ahmad@imus.com", phone: "6281666666666" }
    }),
    prisma.member.upsert({
      where: { id: "member-imus-2" },
      update: {},
      create: { id: "member-imus-2", organizationId: org4.id, fullName: "Siti Nurhaliza", email: "siti@imus.com", phone: "6281777777777" }
    }),
    prisma.member.upsert({
      where: { id: "member-imus-3" },
      update: {},
      create: { id: "member-imus-3", organizationId: org4.id, fullName: "Bambang Sutrisno", email: "bambang@imus.com", phone: "6281888888888" }
    }),
    prisma.member.upsert({
      where: { id: "member-imus-4" },
      update: {},
      create: { id: "member-imus-4", organizationId: org4.id, fullName: "Dewi Kartika", email: "dewi@imus.com", phone: "6281999999999" }
    })
  ]);

  // Create dues for the last few months with some unpaid
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Create dues for last 6 months
  for (let i = 0; i < 6; i++) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    for (const member of members) {
      const duesId = `dues-${member.id}-${year}-${month}`;
      
      await prisma.dues.upsert({
        where: { id: duesId },
        update: {},
        create: {
          id: duesId,
          organizationId: org1.id,
          memberId: member.id,
          month,
          year,
          amount: 50000,
          status: "PENDING"
        }
      });

      // Simulate some payments (not all members pay every month)
      const shouldPay = Math.random() > 0.3; // 70% chance of payment
      if (shouldPay) {
        const paymentId = `payment-${member.id}-${year}-${month}`;
        await prisma.payment.upsert({
          where: { id: paymentId },
          update: {},
          create: {
            id: paymentId,
            duesId,
            memberId: member.id,
            amount: 50000,
            method: "Cash",
            note: "Pembayaran iuran bulanan"
          }
        });

        // Update dues status to PAID
        await prisma.dues.update({
          where: { id: duesId },
          data: { status: "PAID" }
        });
      }
    }
  }

  console.log("Seed done");
}

main().finally(() => prisma.$disconnect());
