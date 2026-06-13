import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let instance: Db | null = null;

function getDb(): Db {
  if (!instance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set. Add your Neon connection string to .env.local");
    }
    instance = drizzle(neon(process.env.DATABASE_URL), { schema });
  }
  return instance;
}

// Lazy proxy so importing this module never throws (e.g. during builds
// or in client bundles that accidentally trace it). The connection is
// only created on first query.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const value = getDb()[prop as keyof Db];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(getDb()) : value;
  },
});
