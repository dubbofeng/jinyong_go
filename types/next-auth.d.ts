import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      email: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: number;
    email: string;
    username?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: number;
    email: string;
  }
}
