import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Adapter, AdapterUser } from "next-auth/adapters";

// Helper to convert Prisma user to AdapterUser
function toAdapterUser(user: {
    id: number;
    email: string;
    name: string | null;
    image: string | null;
    emailVerified: Date | null;
}): AdapterUser {
    return {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        image: user.image,
        emailVerified: user.emailVerified,
    };
}

// Custom adapter to handle integer user IDs
function CustomPrismaAdapter(): Adapter {
    return {
        createUser: async (data) => {
            const user = await prisma.user.create({
                data: {
                    email: data.email,
                    name: data.name,
                    image: data.image,
                    emailVerified: data.emailVerified,
                },
            });
            return toAdapterUser(user);
        },
        getUser: async (id) => {
            const userId = parseInt(id, 10);
            if (isNaN(userId)) return null;
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });
            if (!user) return null;
            return toAdapterUser(user);
        },
        getUserByEmail: async (email) => {
            const user = await prisma.user.findUnique({
                where: { email },
            });
            if (!user) return null;
            return toAdapterUser(user);
        },
        getUserByAccount: async ({ provider, providerAccountId }) => {
            const account = await prisma.account.findUnique({
                where: {
                    provider_providerAccountId: {
                        provider,
                        providerAccountId,
                    },
                },
                include: { user: true },
            });
            if (!account?.user) return null;
            return toAdapterUser(account.user);
        },
        updateUser: async ({ id, ...data }) => {
            const user = await prisma.user.update({
                where: { id: parseInt(id, 10) },
                data: {
                    name: data.name,
                    email: data.email,
                    image: data.image,
                    emailVerified: data.emailVerified,
                },
            });
            return toAdapterUser(user);
        },
        linkAccount: async (data) => {
            await prisma.account.create({
                data: {
                    userId: parseInt(data.userId, 10),
                    type: data.type,
                    provider: data.provider,
                    providerAccountId: data.providerAccountId,
                    refresh_token: data.refresh_token,
                    access_token: data.access_token,
                    expires_at: data.expires_at,
                    token_type: data.token_type,
                    scope: data.scope,
                    id_token: data.id_token,
                    session_state: data.session_state as string | undefined,
                },
            });
        },
        createSession: async (data) => {
            const session = await prisma.session.create({
                data: {
                    userId: parseInt(data.userId, 10),
                    sessionToken: data.sessionToken,
                    expires: data.expires,
                },
            });
            return {
                ...session,
                userId: session.userId.toString(),
            };
        },
        getSessionAndUser: async (sessionToken) => {
            const session = await prisma.session.findUnique({
                where: { sessionToken },
                include: { user: true },
            });
            if (!session) return null;
            return {
                session: {
                    ...session,
                    userId: session.userId.toString(),
                },
                user: toAdapterUser(session.user),
            };
        },
        updateSession: async (data) => {
            const session = await prisma.session.update({
                where: { sessionToken: data.sessionToken },
                data: {
                    expires: data.expires,
                },
            });
            return {
                ...session,
                userId: session.userId.toString(),
            };
        },
        deleteSession: async (sessionToken) => {
            await prisma.session.delete({
                where: { sessionToken },
            });
        },
        createVerificationToken: async (data) => {
            const token = await prisma.verificationToken.create({
                data,
            });
            return token;
        },
        useVerificationToken: async (identifier_token) => {
            const token = await prisma.verificationToken.delete({
                where: { identifier_token },
            });
            return token;
        },
    };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: CustomPrismaAdapter(),
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                });

                if (!user || !user.password) {
                    return null;
                }

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                );

                if (!isValid) {
                    return null;
                }

                return {
                    id: user.id.toString(),
                    email: user.email,
                    name: user.name,
                    image: user.image,
                };
            },
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
});
