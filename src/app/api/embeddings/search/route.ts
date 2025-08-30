import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for search request
const SearchEmbeddingsSchema = z.object({
  query: z.string().min(1, "Query is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
  limit: z.number().min(1).max(20).optional().default(5),
  threshold: z.number().min(0).max(1).optional().default(0.7),
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
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: query,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating query embedding:", error);
    throw new Error("Failed to generate query embedding");
  }
}

// POST - Search embeddings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = SearchEmbeddingsSchema.parse(body);
    const userId = (session as any).uid;

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        organizationId: validatedData.organizationId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate embedding for the query
    const queryEmbedding = await generateQueryEmbedding(validatedData.query);

    // Get all embeddings for this organization
    const embeddings = await prisma.embedding.findMany({
      where: {
        knowledgeBase: {
          organizationId: validatedData.organizationId,
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

    // Calculate similarities and filter by threshold
    const similarities = embeddings
      .map((embedding) => {
        const similarity = cosineSimilarity(queryEmbedding, embedding.embedding);
        return {
          id: embedding.id,
          content: embedding.content,
          similarity,
          knowledgeBase: embedding.knowledgeBase,
          createdAt: embedding.createdAt,
        };
      })
      .filter((item) => item.similarity >= validatedData.threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, validatedData.limit);

    return NextResponse.json({
      query: validatedData.query,
      results: similarities,
      totalResults: similarities.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Error searching embeddings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}