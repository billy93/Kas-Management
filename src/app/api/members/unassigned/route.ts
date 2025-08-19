import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all members who don't have any organization membership
    // First, get all user IDs that have memberships
    const usersWithMemberships = await prisma.membership.findMany({
      select: { userId: true }
    });
    
    const userIdsWithMemberships = usersWithMemberships.map(m => m.userId);
    
    // Get all members whose email doesn't match any user with membership
    const unassignedMembers = await prisma.member.findMany({
      where: {
        email: {
          not: null
        }
      },
      orderBy: { fullName: 'asc' }
    });
    
    // Filter out members whose email matches a user with membership
    const filteredMembers = [];
    
    for (const member of unassignedMembers) {
      if (member.email) {
        const userWithEmail = await prisma.user.findUnique({
          where: { email: member.email },
          select: { id: true }
        });
        
        if (!userWithEmail || !userIdsWithMemberships.includes(userWithEmail.id)) {
          filteredMembers.push(member);
        }
      }
    }

    return NextResponse.json({ members: filteredMembers });
  } catch (error) {
    console.error('Error fetching unassigned members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}