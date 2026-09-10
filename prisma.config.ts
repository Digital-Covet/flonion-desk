import "dotenv/config";
import { definePrismaConfig } from "@prisma/cli-engine";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./app/prisma/contract.prisma",
    db: {
      connection: databaseUrl,
    },
  }),
});
