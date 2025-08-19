import { NextRequest } from "next/server";
import { streamText, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { tool_getUnpaid, tool_getArrears, tool_getBalance, tool_addIncome, tool_addExpense, tool_editIncome, tool_editExpense, tool_deleteTransaction } from "@/lib/ai-tools";

// Removed edge runtime to support Prisma

export async function POST(req: NextRequest) {
  const { messages, organizationId } = await req.json();
  
  console.log('🚀 Chat API called with:', { 
    messagesCount: messages?.length, 
    organizationId,
    lastMessage: messages?.[messages.length - 1]?.content 
  });

  // Get current user session
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    console.log('❌ No authenticated user');
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Get user ID from session
  const userId = (session as any).uid;
  if (!userId) {
    console.log('❌ No user ID in session');
    return new Response(JSON.stringify({ error: 'User ID not found in session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log('✅ User authenticated:', { userId, email: session.user.email });

  // Validate organizationId
  if (!organizationId) {
    console.log('❌ No organizationId provided');
    return new Response(JSON.stringify({ error: 'Organization ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  console.log('✅ organizationId validated:', organizationId);

  try {
    console.log('🤖 Starting streamText with model gpt-4o-mini');
    console.log('📝 Messages to process:', JSON.stringify(messages, null, 2));
    
    // Generate streaming response with tools
    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages,
      maxSteps: 5,
      temperature: 0.7,
      onFinish: async ({ text, toolCalls }) => {
        console.log('✅ Stream finished with text:', text?.substring(0, 100) + '...');
        console.log('🔧 Tool calls executed:', toolCalls?.length || 0);
      },
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'stream-text-chat',
      },
      tools: {
        get_unpaid: {
          description: "List members not fully paid.",
          parameters: z.object({
            organizationId: z.string().optional()
          }),
          execute: async (params) => {
            console.log('🔧 Executing tool_getUnpaid with params:', params);
            const result = await tool_getUnpaid({ ...params, organizationId: params.organizationId || organizationId });
            console.log('🎯 tool_getUnpaid execution completed');
            return result;
          }
        },
        get_arrears: {
          description: "List members in arrears for a given year, with totals.",
          parameters: z.object({
            year: z.number().min(2020).max(2030),
            organizationId: z.string().optional()
          }),
          execute: async (params) => tool_getArrears({ ...params, organizationId: params.organizationId || organizationId })
        },
        get_balance: {
          description: "Get total income, expense, and balance.",
          parameters: z.object({
            organizationId: z.string().optional()
          }),
          execute: async (params) => tool_getBalance({ ...params, organizationId: params.organizationId || organizationId })
        },
        add_income: {
          description: "Add a new income transaction to the organization.",
          parameters: z.object({
            amount: z.number().positive().describe("Amount of income in IDR"),
            category: z.string().describe("Category of income (e.g., 'Donasi', 'Penjualan', 'Lainnya')"),
            note: z.string().optional().describe("Optional note or description"),
            organizationId: z.string().optional(),
            createdById: z.string().optional()
          }),
          execute: async (params) => {
            console.log('🔧 Executing tool_addIncome with params:', params);
            const result = await tool_addIncome({ ...params, organizationId: params.organizationId || organizationId, createdById: userId });
            console.log('🎯 tool_addIncome execution completed');
            return result;
          }
        },
        add_expense: {
          description: "Add a new expense transaction to the organization.",
          parameters: z.object({
            amount: z.number().positive().describe("Amount of expense in IDR"),
            category: z.string().describe("Category of expense (e.g., 'Operasional', 'Konsumsi', 'Transport', 'Lainnya')"),
            note: z.string().optional().describe("Optional note or description"),
            organizationId: z.string().optional(),
            createdById: z.string().optional()
          }),
          execute: async (params) => {
            console.log('🔧 Executing tool_addExpense with params:', params);
            const result = await tool_addExpense({ ...params, organizationId: params.organizationId || organizationId, createdById: userId });
            console.log('🎯 tool_addExpense execution completed');
            return result;
          }
        },
        edit_income: {
          description: "Edit an existing income transaction.",
          parameters: z.object({
            transactionId: z.string().describe("ID of the transaction to edit"),
            amount: z.number().positive().optional().describe("New amount of income in IDR"),
            category: z.string().optional().describe("New category of income (e.g., 'Donasi', 'Penjualan', 'Lainnya')"),
            note: z.string().optional().describe("New note or description"),
            organizationId: z.string().optional(),
            createdById: z.string().optional()
          }),
          execute: async (params) => {
            console.log('🔧 Executing tool_editIncome with params:', params);
            const result = await tool_editIncome({ ...params, organizationId: params.organizationId || organizationId, createdById: userId });
            console.log('🎯 tool_editIncome execution completed');
            return result;
          }
        },
        edit_expense: {
          description: "Edit an existing expense transaction.",
          parameters: z.object({
            transactionId: z.string().describe("ID of the transaction to edit"),
            amount: z.number().positive().optional().describe("New amount of expense in IDR"),
            category: z.string().optional().describe("New category of expense (e.g., 'Operasional', 'Konsumsi', 'Transport', 'Lainnya')"),
            note: z.string().optional().describe("New note or description"),
            organizationId: z.string().optional(),
            createdById: z.string().optional()
          }),
          execute: async (params) => {
            console.log('🔧 Executing tool_editExpense with params:', params);
            const result = await tool_editExpense({ ...params, organizationId: params.organizationId || organizationId, createdById: userId });
            console.log('🎯 tool_editExpense execution completed');
            return result;
          }
        },
        delete_transaction: {
          description: "Delete an existing transaction (income or expense).",
          parameters: z.object({
            transactionId: z.string().describe("ID of the transaction to delete"),
            organizationId: z.string().optional(),
            createdById: z.string().optional()
          }),
          execute: async (params) => {
            console.log('🔧 Executing tool_deleteTransaction with params:', params);
            const result = await tool_deleteTransaction({ ...params, organizationId: params.organizationId || organizationId, createdById: userId });
            console.log('🎯 tool_deleteTransaction execution completed');
            return result;
          }
        }
      },
      system: `You are a helpful finance assistant for a community cash app. You can respond in Indonesian or English based on the user's language.

Current context:
- Current month: ${new Date().getMonth() + 1}
- Current year: ${new Date().getFullYear()}
- Organization ID: ${organizationId}

IMPORTANT RULES:
1. You MUST ALWAYS provide a text response after using any tool
2. NEVER just execute tools silently - always explain the results
3. When you use get_unpaid tool, you MUST format the results clearly
4. Always provide a complete summary of what you found
5. For income/expense transactions, always confirm the action was successful

When users ask about:
- "siapa saja yang belum bayar uang kas" or "who hasn't paid" without specifying time period
- "tambah pemasukan" or "add income" - use add_income tool with amount, category, and optional note
- "tambah pengeluaran" or "add expense" - use add_expense tool with amount, category, and optional note
- "edit pemasukan" or "edit income" - use edit_income tool with transaction ID and fields to update
- "edit pengeluaran" or "edit expense" - use edit_expense tool with transaction ID and fields to update
- "hapus transaksi" or "delete transaction" - use delete_transaction tool with transaction ID
- "saldo" or "balance" - use get_balance tool to show current financial status

For get_unpaid queries, you MUST respond with this exact format:
"Berikut adalah anggota yang belum membayar kas untuk [bulan] [tahun]:
• [Nama] - Rp [jumlah]
• [Nama] - Rp [jumlah]

Total: [jumlah] anggota belum membayar"

If no unpaid members found: "Semua anggota sudah membayar kas untuk [bulan] [tahun]. Tidak ada yang tertunggak."

For income/expense transactions:
- Always ask for amount and category if not provided
- Common income categories: "Donasi", "Penjualan", "Lainnya"
- Common expense categories: "Operasional", "Konsumsi", "Transport", "Lainnya"
- Always confirm the transaction was recorded successfully
- Show the transaction details in a clear format

For editing transactions:
- Always ask for transaction ID if not provided
- Only update the fields that are specified by the user
- Confirm what fields were updated and show the new values

For deleting transactions:
- Always ask for transaction ID if not provided
- Confirm the deletion with transaction details
- Show what was deleted (type, amount, category)

Remember: You must ALWAYS provide a visible text response that users can read. Never leave responses empty.`,
    });

    console.log('✅ streamText initiated');
    
    // Return the streaming response with detailed logging
    return result.toDataStreamResponse({
      onError: (error) => {
        console.error('❌ DataStream error:', error);
      },
      getErrorMessage: (error) => {
        console.error('❌ Error message:', error);
        return 'Terjadi kesalahan dalam memproses permintaan.';
      }
    });
  } catch (error) {
    console.error('❌ Error in chat API:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
