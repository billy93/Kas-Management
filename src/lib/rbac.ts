import { prisma } from "./prisma";
import { Role } from "@prisma/client";

export async function requireRole(userEmail: string, organizationId: string, roles: Role[]) {
  // First get the user by email
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) {
    throw new Error("User not found");
  }

  // Then check membership
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId,
      },
    },
  });
  
  if (!membership || !roles.includes(membership.role)) {
    throw new Error("Forbidden: Insufficient permissions");
  }
}
