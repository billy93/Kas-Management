import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { type AuthOptions } from "next-auth";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  jwt: { maxAge: 30 * 24 * 60 * 60 },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: "whatsapp-otp",
      name: "WhatsApp OTP",
      credentials: {
        phoneNumber: { label: "Phone Number", type: "text" },
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phoneNumber || !credentials?.userId) {
          return null;
        }

        try {
          // Verify user exists with this phone number and ID
          const user = await prisma.user.findUnique({
            where: { 
              id: credentials.userId,
              phoneNumber: credentials.phoneNumber 
            },
            include: {
              memberships: {
                include: {
                  organization: true
                }
              }
            }
          });

          if (!user) {
            return null;
          }

          if (!user.emailVerified) {
            return null;
          }

          if (user.memberships.length === 0) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            phoneNumber: user.phoneNumber,
          };
        } catch (error) {
          console.error('WhatsApp OTP authorization error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow sign in for OAuth providers
      if (account?.provider === "google") {
        try {
          // Check if user exists in database
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
            include: {
              memberships: {
                include: {
                  organization: true
                }
              }
            }
          });

          // If user doesn't exist, deny sign in
          if (!existingUser) {
            console.log('User not found in database:', user.email);
            return '/unauthorized?error=user_not_found';
          }

          // If user exists but email is not verified, deny sign in
          if (existingUser && !existingUser.emailVerified) {
            console.log('User email not verified:', user.email);
            return '/unauthorized?error=email_not_verified';
          }

          // If user exists but has no memberships, store this info in token
          if (existingUser && existingUser.memberships.length === 0) {
            // We'll handle the redirect in the jwt callback
            return true;
          }

          return true;
        } catch (error) {
          console.error('Error checking user verification:', error);
          return '/unauthorized?error=database_error';
        }
      }

      // Allow sign in for WhatsApp OTP (already verified in authorize function)
      if (account?.provider === "whatsapp-otp") {
        return true;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.uid = (user as any).id;
      }
      
      // Always check user memberships and role on every token refresh
      if (token.email) {
        try {
          const userWithMemberships = await prisma.user.findUnique({
            where: { email: token.email },
            include: {
              memberships: {
                include: {
                  organization: true
                }
              }
            }
          });

          token.hasOrganizations = userWithMemberships?.memberships.length > 0;
          token.emailVerified = userWithMemberships?.emailVerified || false;
          
          // Store user role from first membership (assuming single org for now)
          if (userWithMemberships?.memberships.length > 0) {
            token.userRole = userWithMemberships.memberships[0].role;
          }
        } catch (error) {
          console.error('Error checking memberships in JWT:', error);
          token.hasOrganizations = true; // Default to true on error
          token.emailVerified = true; // Default to true on error
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).uid = token.uid;
      (session as any).hasOrganizations = token.hasOrganizations;
      (session as any).emailVerified = token.emailVerified;
      (session as any).userRole = token.userRole;
      return session;
    },
    async redirect({ url, baseUrl }) {
      // If redirecting from signout, go to root/login page
      if (url.includes('/api/auth/signout')) {
        return baseUrl;
      }
      
      // If redirecting from sign in page or root, go to dashboard
      if (url === baseUrl || url === `${baseUrl}/` || url.includes('/api/auth/signin')) {
        return `${baseUrl}/dashboard`;
      }
      
      // If it's a relative path that's not an API route, redirect to dashboard
      if (url.startsWith('/') && !url.startsWith('/api/')) {
        return `${baseUrl}/dashboard`;
      }
      
      // If it's an absolute URL on the same origin and not an API route, allow it
      if (url.startsWith(baseUrl) && !url.includes('/api/auth/signin')) {
        return url;
      }
      
      // Default to dashboard
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    error: '/unauthorized', // Redirect to our custom unauthorized page on error
    signIn: '/', // Redirect to root page for sign in
    signOut: '/', // Redirect to root page after sign out
  },
  secret: process.env.NEXTAUTH_SECRET,
};
