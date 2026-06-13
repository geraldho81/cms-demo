import "next-auth";

declare module "next-auth" {
  interface User {
    role?: "admin" | "editor";
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      role: "admin" | "editor";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}
