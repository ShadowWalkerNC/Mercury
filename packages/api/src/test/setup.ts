/**
 * Vitest global setup — creates an isolated test DB schema and tears it down.
 */
import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '../db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';

beforeAll(async () => {
  await migrate(db, { migrationsFolder: './drizzle' });
});

afterEach(async () => {
  // wipe data between tests without dropping schema
  await db.execute(sql`
    TRUNCATE TABLE
      push_subscriptions, dm_channels, dm_participants,
      reactions, attachments, messages,
      channel_members, channels,
      space_members, spaces,
      refresh_tokens, totp_secrets, users
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await (db as any).$client?.end();
});
