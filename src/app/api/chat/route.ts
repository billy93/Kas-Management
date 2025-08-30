import { NextRequest } from "next/server";
import { streamText, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { tool_getUnpaid, tool_getArrears, tool_getTransaction, tool_addIncome, tool_addExpense, tool_editIncome, tool_editExpense, tool_deleteTransaction } from "@/lib/ai-tools";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import OpenAI from "openai";

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to calculate cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

// Function to generate embedding for query
async function generateQueryEmbedding(query: string): Promise<number[]> {
  try {
    const response = await openaiClient.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating query embedding:", error);
    throw new Error("Failed to generate query embedding");
  }
}

// Function to search relevant knowledge base content directly using Prisma
async function searchKnowledgeBase(query: string, organizationId: string): Promise<string> {
  try {
    console.log('🔍 Searching knowledge base for query:', query);
    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(query);
    console.log('📊 Query embedding generated, length:', queryEmbedding.length);
    console.log("searchKnowledgeBase queryEmbedding : ",queryEmbedding)
    
    // Get all embeddings for this organization
    const embeddings = await prisma.embedding.findMany({
      where: {
        knowledgeBase: {
          organizationId: organizationId,
        },
      },
      include: {
        knowledgeBase: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
      },
    });
    console.log("searchKnowledgeBase embeddings count:", embeddings.length)
    if (embeddings.length > 0) {
      console.log("First embedding length:", embeddings[0].embedding.length);
      console.log("Query embedding length:", queryEmbedding.length);
      console.log("First few values of query embedding:", queryEmbedding.slice(0, 5));
      console.log("First few values of stored embedding:", embeddings[0].embedding.slice(0, 5));
    }

    // Calculate similarities and filter by threshold
    const similarities = embeddings
      .map((embedding:any) => {
        const similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
        console.log(`Similarity for "${embedding.content.substring(0, 50)}...": ${similarity}`);
        return {
          id: embedding.id,
          content: embedding.content,
          similarity,
          knowledgeBase: embedding.knowledgeBase,
          createdAt: embedding.createdAt,
        };
      })
      .filter((item:any) => item.similarity >= 0.1) // Further lowered threshold for debugging
      .sort((a:any, b:any) => b.similarity - a.similarity)
      .slice(0, 3);

    console.log("searchKnowledgeBase similarities : ",similarities)
    if (similarities.length > 0) {
      const relevantContent = similarities
        .map((result:any) => `**${result.knowledgeBase.title}:**\n${result.content}`)
        .join('\n\n');
      
      console.log('🧠 Found relevant knowledge base content:', similarities.length, 'results');
      return relevantContent;
    }
    
    return '';
  } catch (error) {
    console.error('❌ Error searching knowledge base:', error);
    return '';
  }
}

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
    // Search for relevant knowledge base content
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const knowledgeBaseContent = await searchKnowledgeBase(lastUserMessage, organizationId);
    
    console.log('🤖 Starting streamText with model gpt-4o-mini');
    console.log('📝 Messages to process:', JSON.stringify(messages, null, 2));
    console.log('🧠 Knowledge base content found:', knowledgeBaseContent ? 'Yes' : 'No');
    
    const openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY,
    });
    // Generate streaming response with tools
    const result = streamText({
      model: openai('gpt-4o-mini'),
      // model: openrouter('moonshotai/kimi-k2:free'),
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
        get_transaction: {
          description: "Get total income, expense, and balance.",
          parameters: z.object({
            organizationId: z.string().optional()
          }),
          execute: async (params) => tool_getTransaction({ ...params, organizationId: params.organizationId || organizationId })
        },
        // add_income: {
        //   description: "Add a new income transaction to the organization.",
        //   parameters: z.object({
        //     amount: z.number().positive().describe("Amount of income in IDR"),
        //     category: z.string().describe("Category of income (e.g., 'Donasi', 'Penjualan', 'Lainnya')"),
        //     note: z.string().optional().describe("Optional note or description"),
        //     organizationId: z.string().optional(),
        //     createdById: z.string().optional()
        //   }),
        //   execute: async (params) => {
        //     console.log('🔧 Executing tool_addIncome with params:', params);
        //     const result = await tool_addIncome({ ...params, organizationId: params.organizationId || organizationId, createdById: userId });
        //     console.log('🎯 tool_addIncome execution completed');
        //     return result;
        //   }
        // },
        // add_expense: {
        //   description: "Add a new expense transaction to the organization.",
        //   parameters: z.object({
        //     amount: z.number().positive().describe("Amount of expense in IDR"),
        //     category: z.string().describe("Category of expense (e.g., 'Operasional', 'Konsumsi', 'Transport', 'Lainnya')"),
        //     note: z.string().optional().describe("Optional note or description"),
        //     organizationId: z.string().optional(),
        //     createdById: z.string().optional()
        //   }),
        //   execute: async (params) => {
        //     console.log('🔧 Executing tool_addExpense with params:', params);
        //     const result = await tool_addExpense({ ...params, organizationId: params.organizationId || organizationId, createdById: userId });
        //     console.log('🎯 tool_addExpense execution completed');
        //     return result;
        //   }
        // },
        // edit_income: {
        //   description: "Edit an existing income transaction.",
        //   parameters: z.object({
        //     transactionId: z.string().describe("ID of the transaction to edit"),
        //     amount: z.number().positive().optional().describe("New amount of income in IDR"),
        //     category: z.string().optional().describe("New category of income (e.g., 'Donasi', 'Penjualan', 'Lainnya')"),
        //     note: z.string().optional().describe("New note or description"),
        //     organizationId: z.string().optional(),
        //     createdById: z.string().optional()
        //   }),
        //   execute: async (params) => {
        //     console.log('🔧 Executing tool_editIncome with params:', params);
        //     const result = await tool_editIncome({ ...params, organizationId: params.organizationId || organizationId, createdById: userId });
        //     console.log('🎯 tool_editIncome execution completed');
        //     return result;
        //   }
        // },
        // edit_expense: {
        //   description: "Edit an existing expense transaction.",
        //   parameters: z.object({
        //     transactionId: z.string().describe("ID of the transaction to edit"),
        //     amount: z.number().positive().optional().describe("New amount of expense in IDR"),
        //     category: z.string().optional().describe("New category of expense (e.g., 'Operasional', 'Konsumsi', 'Transport', 'Lainnya')"),
        //     note: z.string().optional().describe("New note or description"),
        //     organizationId: z.string().optional(),
        //     createdById: z.string().optional()
        //   }),
        //   execute: async (params) => {
        //     console.log('🔧 Executing tool_editExpense with params:', params);
        //     const result = await tool_editExpense({ ...params, organizationId: params.organizationId || organizationId, createdById: userId });
        //     console.log('🎯 tool_editExpense execution completed');
        //     return result;
        //   }
        // },
        // delete_transaction: {
        //   description: "Delete an existing transaction (income or expense).",
        //   parameters: z.object({
        //     transactionId: z.string().describe("ID of the transaction to delete"),
        //     organizationId: z.string().optional(),
        //     createdById: z.string().optional()
        //   }),
        //   execute: async (params) => {
        //     console.log('🔧 Executing tool_deleteTransaction with params:', params);
        //     const result = await tool_deleteTransaction({ ...params, organizationId: params.organizationId || organizationId, createdById: userId });
        //     console.log('🎯 tool_deleteTransaction execution completed');
        //     return result;
        //   }
        // }
      },
      system: `Anda adalah asisten keuangan yang membantu mengelola kas komunitas. Anda HANYA boleh menjawab pertanyaan berdasarkan:

1. Informasi yang tersedia di Knowledge Base
2. Hasil dari tool/fungsi yang tersedia

Konteks Saat Ini:
- Bulan: ${new Date().getMonth() + 1}
- Tahun: ${new Date().getFullYear()}
- ID Organisasi: ${organizationId}

${knowledgeBaseContent ? `Informasi dari Knowledge Base:

${knowledgeBaseContent}

---

` : ''}

ATURAN PENTING:
- HANYA jawab pertanyaan jika informasinya ada di Knowledge Base atau dapat dijawab dengan menggunakan tool yang tersedia
- Jika pertanyaan tidak dapat dijawab berdasarkan Knowledge Base atau tool, jawab: "Maaf kami tidak dapat menjawab pertanyaan anda"
- JANGAN pernah memberikan informasi umum atau jawaban spekulatif
- JANGAN menjawab pertanyaan di luar konteks kas komunitas yang tidak ada di Knowledge Base

Tool yang Tersedia:
- get_unpaid: Cek anggota yang belum bayar kas
- get_arrears: Cek tunggakan per tahun
- get_transaction: Cek saldo dan ringkasan keuangan

Untuk Pertanyaan Status Pembayaran Anggota Tertentu:
Jika user bertanya "sudah sampai bulan apa [nama] bayar kas?" atau pertanyaan serupa tentang status pembayaran anggota tertentu:
1. WAJIB gunakan tool get_unpaid terlebih dahulu untuk mendapatkan daftar lengkap anggota yang belum bayar
2. Cari nama anggota yang ditanyakan dalam hasil get_unpaid (perhatikan variasi nama seperti "Octa" bisa jadi "Oktavianus" atau sebaliknya)
3. Jika nama anggota TIDAK DITEMUKAN dalam daftar get_unpaid, jawab: "[Nama] sudah membayar kas sampai saat ini (bulan [bulan_sekarang] [tahun_sekarang])"
4. Jika nama anggota DITEMUKAN dalam daftar get_unpaid, jawab: "[Nama] belum membayar kas dan masih memiliki tunggakan sebesar Rp [jumlah]"
5. JANGAN langsung jawab "tidak dapat menemukan informasi" tanpa menggunakan tool get_unpaid terlebih dahulu

Format Respons untuk Tool:

Untuk Tunggakan:
"Daftar Anggota Belum Bayar Kas:

1. [Nama] - Rp [jumlah]
2. [Nama] - Rp [jumlah]
3. [Nama] - Rp [jumlah]

Total: [jumlah] anggota belum membayar
Total Keseluruhan Tunggakan: Rp [total_amount]"

CATATAN: Gunakan penomoran (1., 2., 3., dst.) untuk setiap anggota agar lebih mudah dibaca dan dipahami. Selalu tampilkan total keseluruhan tunggakan di bagian bawah.

Jika Tidak Ada Tunggakan:
"Kabar Baik! Semua anggota sudah membayar kas. Tidak ada tunggakan."

Untuk Saldo:
"Ringkasan Keuangan:

Total Pemasukan: Rp [jumlah] (Transaksi: Rp [transactionIncome] + Pembayaran Kas: Rp [kasPayments])
Total Pengeluaran: Rp [jumlah]
Saldo Akhir: Rp [jumlah]

Catatan: Total pemasukan sudah termasuk semua pembayaran kas dari anggota."

Ingat: Jika tidak ada informasi di Knowledge Base dan tidak bisa menggunakan tool, jawab: "Maaf kami tidak dapat menjawab pertanyaan anda"`,
    });

    console.log('✅ streamText initiated');
    
    // Return the streaming response with detailed logging
    return result.toDataStreamResponse({
      getErrorMessage: (error) => {
        console.error('❌ Error message:', error);
        return 'Terjadi kesalahan dalam memproses permintaan.';
      }
    });
  } catch (error) {
    console.error('❌ Error in chat API:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
