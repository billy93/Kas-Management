import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean2024Data() {
  console.log('Starting cleanup of 2024 data...');
  
  // Delete all payments from 2024
  const paymentsDeleted = await prisma.payment.deleteMany({
    where: {
      paidAt: {
        gte: new Date('2024-01-01'),
        lt: new Date('2025-01-01')
      }
    }
  });
  console.log(`Deleted ${paymentsDeleted.count} payments from 2024`);
  
  // Delete all dues from 2024
  const duesDeleted = await prisma.dues.deleteMany({
    where: {
      year: 2024
    }
  });
  console.log(`Deleted ${duesDeleted.count} dues from 2024`);
  
  // Delete all transactions from 2024
  const transactionsDeleted = await prisma.transaction.deleteMany({
    where: {
      occurredAt: {
        gte: new Date('2024-01-01'),
        lt: new Date('2025-01-01')
      }
    }
  });
  console.log(`Deleted ${transactionsDeleted.count} transactions from 2024`);
  
  console.log('\n=== 2024 Data Cleanup Summary ===');
  console.log(`Total payments deleted: ${paymentsDeleted.count}`);
  console.log(`Total dues deleted: ${duesDeleted.count}`);
  console.log(`Total transactions deleted: ${transactionsDeleted.count}`);
  
  // Show remaining data counts
  const remainingPayments = await prisma.payment.count();
  const remainingDues = await prisma.dues.count();
  const remainingTransactions = await prisma.transaction.count();
  
  console.log('\n=== Remaining Data ===');
  console.log(`Remaining payments: ${remainingPayments}`);
  console.log(`Remaining dues: ${remainingDues}`);
  console.log(`Remaining transactions: ${remainingTransactions}`);
}

clean2024Data()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });