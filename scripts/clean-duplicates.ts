import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDuplicateMembers() {
  console.log('Starting cleanup of duplicate members...');
  
  // Get all members
  const allMembers = await prisma.member.findMany({
    orderBy: { joinedAt: 'asc' } // Keep the oldest one
  });
  
  console.log(`Found ${allMembers.length} total members`);
  
  // Group by fullName to find duplicates
  const memberGroups = new Map<string, typeof allMembers>();
  
  for (const member of allMembers) {
    const key = member.fullName.toLowerCase().trim();
    if (!memberGroups.has(key)) {
      memberGroups.set(key, []);
    }
    memberGroups.get(key)!.push(member);
  }
  
  let duplicatesFound = 0;
  let duplicatesRemoved = 0;
  
  for (const [name, members] of memberGroups) {
    if (members.length > 1) {
      duplicatesFound++;
      console.log(`\nFound ${members.length} duplicates for: ${name}`);
      
      // Keep the first one (oldest), remove the rest
      const [keepMember, ...duplicateMembers] = members;
      console.log(`Keeping member ID: ${keepMember.id} (joined: ${keepMember.joinedAt})`);
      
      for (const duplicate of duplicateMembers) {
        console.log(`Removing duplicate ID: ${duplicate.id} (joined: ${duplicate.joinedAt})`);
        
        try {
          // Delete related records first
          await prisma.payment.deleteMany({
            where: { memberId: duplicate.id }
          });
          
          await prisma.dues.deleteMany({
            where: { memberId: duplicate.id }
          });
          
          // Delete the duplicate member
          await prisma.member.delete({
            where: { id: duplicate.id }
          });
          
          duplicatesRemoved++;
          console.log(`✓ Successfully removed duplicate: ${duplicate.id}`);
        } catch (error) {
          console.error(`✗ Error removing duplicate ${duplicate.id}:`, error);
        }
      }
    }
  }
  
  console.log(`\n=== Cleanup Summary ===`);
  console.log(`Duplicate groups found: ${duplicatesFound}`);
  console.log(`Duplicate members removed: ${duplicatesRemoved}`);
  
  // Show final count
  const finalCount = await prisma.member.count();
  console.log(`Final member count: ${finalCount}`);
}

cleanDuplicateMembers()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });