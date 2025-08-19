import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetData() {
  try {
    console.log('🗑️ Memulai reset data...');
    
    // Hapus data dalam urutan yang benar untuk menghindari foreign key constraint
    console.log('Menghapus Payment...');
    await prisma.payment.deleteMany({});
    
    console.log('Menghapus Dues...');
    await prisma.dues.deleteMany({});
    
    console.log('Menghapus DuesConfig...');
    await prisma.duesConfig.deleteMany({});
    
    console.log('Menghapus Transaction...');
    await prisma.transaction.deleteMany({});
    
    console.log('Menghapus UserMemberLink...');
    await prisma.userMemberLink.deleteMany({});
    
    console.log('Menghapus Member...');
    await prisma.member.deleteMany({});
    
    console.log('Menghapus Account (NextAuth)...');
    await prisma.account.deleteMany({});
    
    console.log('Menghapus Session (NextAuth)...');
    await prisma.session.deleteMany({});
    
    console.log('✅ Reset data berhasil!');
    console.log('📊 Data yang tersisa:');
    
    // Tampilkan data yang tersisa
    const userCount = await prisma.user.count();
    const orgCount = await prisma.organization.count();
    const membershipCount = await prisma.membership.count();
    
    console.log(`- Users: ${userCount}`);
    console.log(`- Organizations: ${orgCount}`);
    console.log(`- Memberships: ${membershipCount}`);
    
    console.log('\n🎯 Sistem siap untuk memulai dari awal!');
    
  } catch (error) {
    console.error('❌ Error saat reset data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Jalankan script
resetData();