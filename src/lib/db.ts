import { desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { z } from 'zod';

import { type Monitor, monitorFormSchema } from '@/schemas/monitor';

import * as schema from '../../db/schema';
import {
  type DrizzleMonitor,
  type DrizzleMonitorInsert
} from '../../db/schema';

export const DATABASE_NAME = 'uptimekuma1111101111.db';
export const db = drizzle(
  openDatabaseSync(DATABASE_NAME, {
    enableChangeListener: true,
    useNewConnection: true
  })
);

export class DatabaseService {
  private static instance: DatabaseService;

  static getInstance(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService();
    }
    return this.instance;
  }

  private serialize(value: any): any {
    if (value == null) return null;
    return typeof value === 'object'
      ? JSON.stringify(value)
      : typeof value === 'boolean'
        ? +value
        : value;
  }

  private deserialize(value: any, type: z.ZodTypeAny): any {
    if (value == null) return null;

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) || typeof parsed === 'object') {
          return parsed;
        }
      } catch {
        return value;
      }
    }

    if (type instanceof z.ZodBoolean && typeof value === 'number') {
      return Boolean(value);
    }

    return value;
  }

  private async parseMonitor(monitor: DrizzleMonitor): Promise<Monitor> {
    const monitorTags = await this.getMonitorTags(monitor.id!);
    const tags = await Promise.all(
      monitorTags.map(async (mt) => {
        const tag = await db
          .select()
          .from(schema.tags)
          .where(eq(schema.tags.id, mt.tagId))
          .get();
        return {
          id: mt.tagId,
          tag_id: mt.tagId,
          monitor_id: mt.monitorId,
          value: mt.value ?? '',
          name: tag?.name ?? '',
          color: tag?.color ?? ''
        };
      })
    );

    const parsedData = Object.fromEntries(
      Object.entries(monitor).map(([key, value]) => [
        key,
        this.deserialize(value, z.any())
      ])
    );

    return monitorFormSchema.parse({ ...parsedData, tags });
  }

  private readonly EXCLUDED_MONITOR_FIELDS = new Set([
    'tags',
    'heartBeatList',
    'importantHeartBeatList',
    'uptime',
    'avgPing',
    'isUp'
  ]);

  private async processMonitorTags(
    monitorId: number,
    tags: Monitor['tags'],
    transaction?: any
  ) {
    const executor = transaction || db;

    const tagUpserts = tags.map((tag) => ({
      id: tag.tag_id || tag.id,
      name: tag.name,
      color: tag.color
    }));

    await Promise.all(
      tagUpserts.map((tag) =>
        executor
          .insert(schema.tags)
          .values(tag)
          .onConflictDoUpdate({
            target: [schema.tags.id],
            set: { name: tag.name, color: tag.color }
          })
      )
    );

    await executor
      .delete(schema.monitorTags)
      .where(eq(schema.monitorTags.monitorId, monitorId));

    if (tags.length > 0) {
      const monitorTagValues = tags
        .filter((tag) => tag.tag_id || tag.id)
        .map((tag) => ({
          monitorId,
          tagId: tag.tag_id || tag.id!,
          value: tag.value || null
        }));

      if (monitorTagValues.length > 0) {
        await executor.insert(schema.monitorTags).values(monitorTagValues);
      }
    }
  }

  private async stringifyMonitor(
    monitor: Monitor
  ): Promise<DrizzleMonitorInsert> {
    if (monitor.id && monitor.tags) {
      await db.transaction(async (tx) => {
        await this.processMonitorTags(monitor.id!, monitor.tags, tx);
      });
    }

    const parsed = monitorFormSchema.parse(monitor);
    const baseMonitor = Object.fromEntries(
      Object.entries(parsed).filter(
        ([key]) => !this.EXCLUDED_MONITOR_FIELDS.has(key)
      )
    );

    return Object.fromEntries(
      Object.entries(baseMonitor)
        .filter(([k]) => k in schema.monitors)
        .map(([k, v]) => [k, this.serialize(v)])
    ) as DrizzleMonitorInsert;
  }

  // Monitor operations
  async getMonitors() {
    const monitors = await db.select().from(schema.monitors);
    return monitors.map(this.parseMonitor);
  }

  async getMonitor(id: number) {
    const monitor = await db
      .select()
      .from(schema.monitors)
      .where(eq(schema.monitors.id, id))
      .get();
    return monitor ? this.parseMonitor(monitor) : null;
  }

  async upsertMonitor(monitor: Monitor) {
    const data = await this.stringifyMonitor(monitor);
    return await db.insert(schema.monitors).values(data).onConflictDoUpdate({
      target: schema.monitors.id,
      set: data
    });
  }

  async deleteMonitor(id: number) {
    return await db.delete(schema.monitors).where(eq(schema.monitors.id, id));
  }

  // Heartbeat operations
  async getHeartbeats(monitorId: number, limit = 30) {
    return await db
      .select()
      .from(schema.heartbeats)
      .where(eq(schema.heartbeats.monitor_id, monitorId))
      .orderBy(desc(schema.heartbeats.time))
      .limit(limit);
  }

  async addHeartbeat(heartbeat: schema.HeartBeatInsert) {
    return await db.insert(schema.heartbeats).values(heartbeat);
  }

  async getImportantHeartbeats(limit = 10, offset = 0) {
    return await db
      .select()
      .from(schema.heartbeats)
      .where(eq(schema.heartbeats.important, true))
      .orderBy(desc(schema.heartbeats.time))
      .limit(limit)
      .offset(offset);
  }

  // Tag operations
  async getTags() {
    return await db.select().from(schema.tags);
  }

  async upsertTag(tag: Partial<schema.TagInsert>) {
    if (!tag.name || !tag.color) {
      console.warn('Tag missing required fields:', tag);
      return;
    }

    try {
      return await db
        .insert(schema.tags)
        .values({
          id: tag.id,
          name: tag.name,
          color: tag.color
        })
        .onConflictDoUpdate({
          target: [schema.tags.id],
          set: {
            name: tag.name,
            color: tag.color
          },
          where: eq(schema.tags.id, tag.id as number)
        });
    } catch (error) {
      console.error('Error upserting tag:', error);
      throw error;
    }
  }

  async deleteTag(id: number) {
    return await db.delete(schema.tags).where(eq(schema.tags.id, id));
  }

  // Monitor-Tag relations
  async getMonitorTags(monitorId: number) {
    return await db
      .select()
      .from(schema.monitorTags)
      .where(eq(schema.monitorTags.monitorId, monitorId));
  }

  async upsertMonitorTag(monitorTag: schema.MonitorTagInsert) {
    // First check if the tag already exists
    const existing = await db
      .select()
      .from(schema.monitorTags)
      .where(
        sql`monitor_id = ${monitorTag.monitorId} AND tag_id = ${monitorTag.tagId ?? monitorTag.id}`
      )
      .get();

    if (existing) {
      return await db
        .update(schema.monitorTags)
        .set(monitorTag)
        .where(
          sql`monitor_id = ${monitorTag.monitorId} AND tag_id = ${monitorTag.tagId ?? monitorTag.id}`
        );
    } else {
      return await db.insert(schema.monitorTags).values(monitorTag);
    }
  }

  // Maintenance
  async cleanup(olderThan: Date) {
    return await db
      .delete(schema.heartbeats)
      .where(sql`time < ${olderThan.toISOString()}`);
  }

  async shrink() {
    return await db.$client.execAsync('VACUUM');
  }

  async reset() {
    await db.delete(schema.heartbeats);
    await db.delete(schema.monitorTags);
    await db.delete(schema.monitors);
    await db.delete(schema.tags);
  }
}

export const databaseService = DatabaseService.getInstance();
