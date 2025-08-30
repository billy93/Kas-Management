import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for creating knowledge base
const CreateKnowledgeBaseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  organizationId: z.string().min(1, "Organization ID is required"),
});

// Function to chunk text into smaller pieces
function chunkText(text: string, maxChunkSize: number = 1000): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (currentChunk.length + trimmedSentence.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = trimmedSentence;
      } else {
        // If single sentence is too long, split it
        chunks.push(trimmedSentence.substring(0, maxChunkSize));
      }
    } else {
      currentChunk += (currentChunk ? ". " : "") + trimmedSentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter(chunk => chunk.length > 0);
}

// Function to generate embeddings
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

// GET - List all knowledge bases for an organization
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
      where: {
        userId: (session as any).uid,
        organizationId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const knowledgeBases = await prisma.knowledgeBase.findMany({
      where: { organizationId },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
        _count: {
          select: { embeddings: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ knowledgeBases });
  } catch (error) {
    console.error("Error fetching knowledge bases:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create new knowledge base with embeddings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = CreateKnowledgeBaseSchema.parse(body);
    const userId = (session as any).uid;

    // Check if user has admin or treasurer access to this organization
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        organizationId: validatedData.organizationId,
        role: { in: ["ADMIN", "TREASURER"] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied. Admin or Treasurer role required." }, { status: 403 });
    }

    // Create knowledge base
    const knowledgeBase = await prisma.knowledgeBase.create({
      data: {
        title: validatedData.title,
        content: validatedData.content,
        organizationId: validatedData.organizationId,
        createdById: userId,
      },
    });

    // Chunk the content
    const chunks = chunkText(validatedData.content);

    // Generate embeddings for each chunk
    const embeddingPromises = chunks.map(async (chunk) => {
      const embedding = await generateEmbedding(chunk);
      return {
        knowledgeBaseId: knowledgeBase.id,
        content: chunk,
        embedding,
      };
    });

    const embeddingData = await Promise.all(embeddingPromises);

    // Save embeddings to database
    await prisma.embedding.createMany({
      data: embeddingData,
    });

    return NextResponse.json({
      message: "Knowledge base created successfully",
      knowledgeBase: {
        ...knowledgeBase,
        embeddingsCount: chunks.length,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Error creating knowledge base:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}