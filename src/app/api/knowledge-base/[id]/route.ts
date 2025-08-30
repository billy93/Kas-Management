import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for updating knowledge base
const UpdateKnowledgeBaseSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().min(1, "Content is required").optional(),
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
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

// GET - Get specific knowledge base
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const knowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: { name: true, email: true },
        },
        organization: {
          select: { id: true, name: true },
        },
        _count: {
          select: { embeddings: true },
        },
      },
    });

    if (!knowledgeBase) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    // Check if user has access to this organization
    const membership = await prisma.membership.findFirst({
      where: {
        userId: (session as any).uid,
        organizationId: knowledgeBase.organizationId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({ knowledgeBase });
  } catch (error) {
    console.error("Error fetching knowledge base:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT - Update knowledge base
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await req.json();
    const validatedData = UpdateKnowledgeBaseSchema.parse(body);
    const userId = (session as any).uid;

    // Get existing knowledge base
    const existingKnowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id: params.id },
    });

    if (!existingKnowledgeBase) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    // Check if user has admin or treasurer access to this organization
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        organizationId: existingKnowledgeBase.organizationId,
        role: { in: ["ADMIN", "TREASURER"] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied. Admin or Treasurer role required." }, { status: 403 });
    }

    // Update knowledge base
    const updatedKnowledgeBase = await prisma.knowledgeBase.update({
      where: { id: params.id },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.content && { content: validatedData.content }),
        updatedAt: new Date(),
      },
    });

    // If content was updated, regenerate embeddings
    if (validatedData.content) {
      // Delete existing embeddings
      await prisma.embedding.deleteMany({
        where: { knowledgeBaseId: params.id },
      });

      // Chunk the new content
      const chunks = chunkText(validatedData.content);

      // Generate new embeddings
      const embeddingPromises = chunks.map(async (chunk) => {
        const embedding = await generateEmbedding(chunk);
        return {
          knowledgeBaseId: params.id,
          content: chunk,
          embedding,
        };
      });

      const embeddingData = await Promise.all(embeddingPromises);

      // Save new embeddings
      await prisma.embedding.createMany({
        data: embeddingData,
      });
    }

    return NextResponse.json({
      message: "Knowledge base updated successfully",
      knowledgeBase: updatedKnowledgeBase,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation error", details: error.errors }, { status: 400 });
    }
    console.error("Error updating knowledge base:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Delete knowledge base
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const userId = (session as any).uid;

    // Get existing knowledge base
    const existingKnowledgeBase = await prisma.knowledgeBase.findUnique({
      where: { id: params.id },
    });

    if (!existingKnowledgeBase) {
      return NextResponse.json({ error: "Knowledge base not found" }, { status: 404 });
    }

    // Check if user has admin or treasurer access to this organization
    const membership = await prisma.membership.findFirst({
      where: {
        userId,
        organizationId: existingKnowledgeBase.organizationId,
        role: { in: ["ADMIN", "TREASURER"] },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied. Admin or Treasurer role required." }, { status: 403 });
    }

    // Delete knowledge base (embeddings will be deleted automatically due to cascade)
    await prisma.knowledgeBase.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Knowledge base deleted successfully" });
  } catch (error) {
    console.error("Error deleting knowledge base:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}