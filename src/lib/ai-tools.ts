import { prisma } from "@/lib/prisma";

export async function tool_getUnpaid({ organizationId }: { organizationId?: string }) {
  console.log('🔍 tool_getUnpaid called with:', { organizationId });
  
  // Get organizationId if not provided
  let orgId = organizationId;
  if (!orgId) {
    console.log('⚠️ No organizationId provided, finding first organization');
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.log('❌ No organization found in database');
      throw new Error('No organization found');
    }
    orgId = org.id;
    console.log('✅ Using first organization:', orgId);
  } else {
    console.log('✅ Using provided organizationId:', orgId);
  }

  console.log('🔍 Querying all unpaid dues for organization:', orgId);
  
  try {
    const dues = await prisma.dues.findMany({
      where: { 
        organizationId: orgId, 
        status: {
          in: ["PENDING", "PARTIAL"]
        }
      },
      include: { member: true, payments: true },
    });
    
    console.log('📊 Found dues records:', dues.length);
     
     if (dues.length === 0) {
       console.log('⚠️ No unpaid dues found');
       return [];
     }
     
     // Group by member and calculate total unpaid amount
     const memberTotals = new Map();
     
     dues.forEach(d => {
       const memberId = d.member.id;
       const totalPaid = d.payments.reduce((a, p) => a + p.amount, 0);
       const remainingAmount = d.amount - totalPaid;
       
       if (remainingAmount > 0) {
         if (!memberTotals.has(memberId)) {
           memberTotals.set(memberId, {
             member: d.member.fullName,
             email: d.member.email,
             phone: d.member.phone,
             totalUnpaid: 0,
             unpaidMonths: 0
           });
         }
         
         const memberData = memberTotals.get(memberId);
         memberData.totalUnpaid += remainingAmount;
         memberData.unpaidMonths += 1;
       }
     });
     
     const result = Array.from(memberTotals.values()).sort((a, b) => b.totalUnpaid - a.totalUnpaid);
     
     console.log('✅ tool_getUnpaid result:', result);
     return result;
  } catch (error) {
    console.error('❌ Error in tool_getUnpaid:', error);
    throw error;
  }
 }

export async function tool_getArrears({ year, organizationId }: { year: number; organizationId?: string }) {
  // Get organizationId if not provided
  let orgId = organizationId;
  if (!orgId) {
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('No organization found');
    orgId = org.id;
  }

  const dues = await prisma.dues.findMany({ where: { organizationId: orgId, year }, include: { member: true, payments: true } });
  const byMember = new Map<string, { member: string; totalDue: number; totalPaid: number }>();
  for (const d of dues) {
    const key = d.memberId;
    const rec = byMember.get(key) || { member: d.member.fullName, totalDue: 0, totalPaid: 0 };
    rec.totalDue += d.amount;
    rec.totalPaid += d.payments.reduce((a, p) => a + p.amount, 0);
    byMember.set(key, rec);
  }
  return Array.from(byMember.values()).filter(r => r.totalPaid < r.totalDue).map(r => ({ ...r, arrears: r.totalDue - r.totalPaid }));
}

export async function tool_getBalance({ organizationId }: { organizationId?: string }) {
  // Get organizationId if not provided
  let orgId = organizationId;
  if (!orgId) {
    const org = await prisma.organization.findFirst();
    if (!org) throw new Error('No organization found');
    orgId = org.id;
  }

  const tx = await prisma.transaction.findMany({ where: { organizationId: orgId } });
  const income = tx.filter(t => t.type === "INCOME").reduce((a, t) => a + t.amount, 0);
  const expense = tx.filter(t => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0);
  return { income, expense, balance: income - expense };
}

export async function tool_addIncome({ 
  amount, 
  category, 
  note, 
  organizationId, 
  createdById 
}: { 
  amount: number; 
  category: string; 
  note?: string; 
  organizationId?: string; 
  createdById?: string; 
}) {
  console.log('💰 tool_addIncome called with:', { amount, category, note, organizationId, createdById });
  
  // Get organizationId if not provided
  let orgId = organizationId;
  if (!orgId) {
    console.log('⚠️ No organizationId provided, finding first organization');
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.log('❌ No organization found in database');
      throw new Error('No organization found');
    }
    orgId = org.id;
    console.log('✅ Using first organization:', orgId);
  }

  // Validate createdById is provided
  if (!createdById) {
    console.log('❌ No createdById provided');
    throw new Error('User ID is required for creating transactions');
  }
  
  const userId = createdById;
  console.log('✅ Using provided createdById:', userId);
  
  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.log('❌ User not found with ID:', userId);
    throw new Error('User not found');
  }
  console.log('✅ User verified:', user.email);

  try {
    const transaction = await prisma.transaction.create({
      data: {
        type: 'INCOME',
        amount,
        category,
        note: note || '',
        occurredAt: new Date(),
        organizationId: orgId,
        createdById: userId
      }
    });
    
    console.log('✅ Income transaction created:', transaction.id);
    return {
      success: true,
      message: `Pemasukan sebesar Rp ${amount.toLocaleString('id-ID')} untuk kategori "${category}" berhasil ditambahkan.`,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        category: transaction.category,
        note: transaction.note,
        date: transaction.occurredAt
      }
    };
  } catch (error) {
    console.error('❌ Error in tool_addIncome:', error);
    throw error;
  }
}

export async function tool_editIncome({ 
  transactionId,
  amount, 
  category, 
  note, 
  organizationId, 
  createdById 
}: { 
  transactionId: string;
  amount?: number; 
  category?: string; 
  note?: string; 
  organizationId?: string; 
  createdById?: string; 
}) {
  console.log('✏️ tool_editIncome called with:', { transactionId, amount, category, note, organizationId, createdById });
  
  // Validate createdById is provided
  if (!createdById) {
    console.log('❌ No createdById provided');
    throw new Error('User ID is required for editing transactions');
  }
  
  const userId = createdById;
  console.log('✅ Using provided createdById:', userId);
  
  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.log('❌ User not found with ID:', userId);
    throw new Error('User not found');
  }
  console.log('✅ User verified:', user.email);

  try {
    // First, verify the transaction exists and is an income transaction
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!existingTransaction) {
      console.log('❌ Transaction not found with ID:', transactionId);
      throw new Error('Transaction not found');
    }
    
    if (existingTransaction.type !== 'INCOME') {
      console.log('❌ Transaction is not an income transaction:', existingTransaction.type);
      throw new Error('Transaction is not an income transaction');
    }
    
    // Prepare update data - only include fields that are provided
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = amount;
    if (category !== undefined) updateData.category = category;
    if (note !== undefined) updateData.note = note;
    
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: updateData
    });
    
    console.log('✅ Income transaction updated:', transaction.id);
    return {
      success: true,
      message: `Pemasukan berhasil diperbarui. ${amount ? `Jumlah: Rp ${amount.toLocaleString('id-ID')}` : ''} ${category ? `Kategori: "${category}"` : ''}.`,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        category: transaction.category,
        note: transaction.note,
        date: transaction.occurredAt
      }
    };
  } catch (error) {
    console.error('❌ Error in tool_editIncome:', error);
    throw error;
  }
}

export async function tool_editExpense({ 
  transactionId,
  amount, 
  category, 
  note, 
  organizationId, 
  createdById 
}: { 
  transactionId: string;
  amount?: number; 
  category?: string; 
  note?: string; 
  organizationId?: string; 
  createdById?: string; 
}) {
  console.log('✏️ tool_editExpense called with:', { transactionId, amount, category, note, organizationId, createdById });
  
  // Validate createdById is provided
  if (!createdById) {
    console.log('❌ No createdById provided');
    throw new Error('User ID is required for editing transactions');
  }
  
  const userId = createdById;
  console.log('✅ Using provided createdById:', userId);
  
  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.log('❌ User not found with ID:', userId);
    throw new Error('User not found');
  }
  console.log('✅ User verified:', user.email);

  try {
    // First, verify the transaction exists and is an expense transaction
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!existingTransaction) {
      console.log('❌ Transaction not found with ID:', transactionId);
      throw new Error('Transaction not found');
    }
    
    if (existingTransaction.type !== 'EXPENSE') {
      console.log('❌ Transaction is not an expense transaction:', existingTransaction.type);
      throw new Error('Transaction is not an expense transaction');
    }
    
    // Prepare update data - only include fields that are provided
    const updateData: any = {};
    if (amount !== undefined) updateData.amount = amount;
    if (category !== undefined) updateData.category = category;
    if (note !== undefined) updateData.note = note;
    
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: updateData
    });
    
    console.log('✅ Expense transaction updated:', transaction.id);
    return {
      success: true,
      message: `Pengeluaran berhasil diperbarui. ${amount ? `Jumlah: Rp ${amount.toLocaleString('id-ID')}` : ''} ${category ? `Kategori: "${category}"` : ''}.`,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        category: transaction.category,
        note: transaction.note,
        date: transaction.occurredAt
      }
    };
  } catch (error) {
    console.error('❌ Error in tool_editExpense:', error);
    throw error;
  }
}

export async function tool_deleteTransaction({ 
  transactionId,
  organizationId, 
  createdById 
}: { 
  transactionId: string;
  organizationId?: string; 
  createdById?: string; 
}) {
  console.log('🗑️ tool_deleteTransaction called with:', { transactionId, organizationId, createdById });
  
  // Validate createdById is provided
  if (!createdById) {
    console.log('❌ No createdById provided');
    throw new Error('User ID is required for deleting transactions');
  }
  
  const userId = createdById;
  console.log('✅ Using provided createdById:', userId);
  
  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.log('❌ User not found with ID:', userId);
    throw new Error('User not found');
  }
  console.log('✅ User verified:', user.email);

  try {
    // First, verify the transaction exists
    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });
    
    if (!existingTransaction) {
      console.log('❌ Transaction not found with ID:', transactionId);
      throw new Error('Transaction not found');
    }
    
    // Store transaction details for response
    const transactionDetails = {
      id: existingTransaction.id,
      type: existingTransaction.type,
      amount: existingTransaction.amount,
      category: existingTransaction.category,
      note: existingTransaction.note,
      date: existingTransaction.occurredAt
    };
    
    // Delete the transaction
    await prisma.transaction.delete({
      where: { id: transactionId }
    });
    
    console.log('✅ Transaction deleted:', transactionId);
    return {
      success: true,
      message: `${existingTransaction.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'} sebesar Rp ${existingTransaction.amount.toLocaleString('id-ID')} untuk kategori "${existingTransaction.category}" berhasil dihapus.`,
      deletedTransaction: transactionDetails
    };
  } catch (error) {
    console.error('❌ Error in tool_deleteTransaction:', error);
    throw error;
  }
}

export async function tool_addExpense({ 
  amount, 
  category, 
  note, 
  organizationId, 
  createdById 
}: { 
  amount: number; 
  category: string; 
  note?: string; 
  organizationId?: string; 
  createdById?: string; 
}) {
  console.log('💸 tool_addExpense called with:', { amount, category, note, organizationId, createdById });
  
  // Get organizationId if not provided
  let orgId = organizationId;
  if (!orgId) {
    console.log('⚠️ No organizationId provided, finding first organization');
    const org = await prisma.organization.findFirst();
    if (!org) {
      console.log('❌ No organization found in database');
      throw new Error('No organization found');
    }
    orgId = org.id;
    console.log('✅ Using first organization:', orgId);
  }

  // Validate createdById is provided
  if (!createdById) {
    console.log('❌ No createdById provided');
    throw new Error('User ID is required for creating transactions');
  }
  
  const userId = createdById;
  console.log('✅ Using provided createdById:', userId);
  
  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    console.log('❌ User not found with ID:', userId);
    throw new Error('User not found');
  }
  console.log('✅ User verified:', user.email);

  try {
    const transaction = await prisma.transaction.create({
      data: {
        type: 'EXPENSE',
        amount,
        category,
        note: note || '',
        occurredAt: new Date(),
        organizationId: orgId,
        createdById: userId
      }
    });
    
    console.log('✅ Expense transaction created:', transaction.id);
    return {
      success: true,
      message: `Pengeluaran sebesar Rp ${amount.toLocaleString('id-ID')} untuk kategori "${category}" berhasil ditambahkan.`,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        category: transaction.category,
        note: transaction.note,
        date: transaction.occurredAt
      }
    };
  } catch (error) {
    console.error('❌ Error in tool_addExpense:', error);
    throw error;
  }
}
