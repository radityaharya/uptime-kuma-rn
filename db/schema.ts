import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { type z } from 'zod';

import { type MonitorType } from '@/schemas/monitor';
export const monitors = sqliteTable('monitor', {
  // Core Fields
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').$type<MonitorType>(),
  description: text('description'),
  pathName: text('pathName'),
  status: text('status'),
  weight: integer('weight').notNull().default(1),
  parent: integer('parent'),
  childrenIDs: text('childrenIDs').notNull().default('[]'),

  // State & Control Fields
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  forceInactive: integer('forceInactive', { mode: 'boolean' })
    .notNull()
    .default(false),
  maintenance: integer('maintenance', { mode: 'boolean' })
    .notNull()
    .default(false),

  // Monitor Configuration
  interval: integer('interval'),
  timeout: integer('timeout').default(1),
  maxretries: integer('maxretries').notNull().default(0),
  retryInterval: integer('retryInterval').notNull().default(10),
  resendInterval: integer('resendInterval').notNull().default(0),
  upsideDown: integer('upsideDown', { mode: 'boolean' })
    .notNull()
    .default(false),
  notificationIDList: text('notificationIDList'),

  // HTTP/HTTPS Monitor Fields
  url: text('url'),
  method: text('method'),
  headers: text('headers'),
  body: text('body'),
  httpBodyEncoding: text('httpBodyEncoding'),
  ignoreTls: integer('ignoreTls', { mode: 'boolean' }),
  maxredirects: integer('maxredirects'),
  proxyId: integer('proxyId'),
  accepted_statuscodes: text('acceptedStatuscodes'),

  // Authentication Fields
  authMethod: text('authMethod'),
  authDomain: text('authDomain'),
  authWorkstation: text('authWorkstation'),
  basic_auth_user: text('basicAuthUser'),
  basic_auth_pass: text('basicAuthPass'),

  // OAuth Fields
  oauth_auth_method: text('oauth_auth_method'),
  oauth_client_id: text('oauth_client_id'),
  oauth_client_secret: text('oauth_client_secret'),
  oauth_token_url: text('oauth_token_url'),
  oauth_scopes: text('oauth_scopes'),

  // SSL/TLS Fields
  tlsCa: text('tlsCa'),
  tlsCert: text('tlsCert'),
  tlsKey: text('tlsKey'),

  // DNS Monitor Fields
  hostname: text('hostname'),
  dnsResolveServer: text('dnsResolveServer'),
  dnsResolveType: text('dnsResolveType'),
  dns_last_result: text('dns_last_result'),

  // Port/Ping Monitor Fields
  port: integer('port'),
  packetSize: integer('packetSize'),

  // Docker Monitor Fields
  dockerHost: text('dockerHost'),
  dockerContainer: text('dockerContainer'),

  // Database Monitor Fields
  databaseConnectionString: text('databaseConnectionString'),
  databaseQuery: text('databaseQuery'),

  // MQTT Monitor Fields
  mqttUsername: text('mqttUsername'),
  mqttPassword: text('mqttPassword'),
  mqttTopic: text('mqttTopic'),
  mqttSuccessMessage: text('mqttSuccessMessage'),
  mqttCheckType: text('mqttCheckType'),

  // JSON/Keyword Monitor Fields
  keyword: text('keyword'),
  invertKeyword: integer('invertKeyword', { mode: 'boolean' }),
  jsonPath: text('jsonPath'),
  jsonPathOperator: text('jsonPathOperator'),
  expectedValue: text('expectedValue'),

  // Real Browser Monitor Fields
  browser_width: integer('browser_width'),
  browser_height: integer('browser_height'),
  remote_browser: integer('remote_browser'),

  // RADIUS Monitor Fields
  radiusUsername: text('radiusUsername'),
  radiusPassword: text('radiusPassword'),
  radiusSecret: text('radiusSecret'),
  radiusCalledStationId: text('radiusCalledStationId'),
  radiusCallingStationId: text('radiusCallingStationId'),

  // Kafka Monitor Fields
  kafkaProducerBrokers: text('kafkaProducerBrokers'),
  kafkaProducerTopic: text('kafkaProducerTopic'),
  kafkaProducerMessage: text('kafkaProducerMessage'),
  kafkaProducerSsl: integer('kafkaProducerSsl', { mode: 'boolean' }),
  kafkaProducerAllowAutoTopicCreation: integer(
    'kafkaProducerAllowAutoTopicCreation',
    { mode: 'boolean' }
  ),
  kafkaProducerSaslOptions: text('kafkaProducerSaslOptions'),

  // gRPC Monitor Fields
  grpcUrl: text('grpcUrl'),
  grpcProtobuf: text('grpcProtobuf'),
  grpcServiceName: text('grpcServiceName'),
  grpcMethod: text('grpcMethod'),
  grpcBody: text('grpcBody'),
  grpcMetadata: text('grpcMetadata'),
  grpcEnableTls: integer('grpcEnableTls', { mode: 'boolean' }),

  // Game Server Monitor Fields
  game: text('game'),
  gamedigGivenPortOnly: integer('gamedigGivenPortOnly', { mode: 'boolean' }),

  // Push Monitor Fields
  pushToken: text('pushToken'),

  // RabbitMQ Monitor Fields
  rabbitmqNodes: text('rabbitmqNodes'),
  rabbitmqUsername: text('rabbitmqUsername'),
  rabbitmqPassword: text('rabbitmqPassword'),

  // SNMP Monitor Fields
  snmpOid: text('snmpOid'),
  snmpVersion: text('snmpVersion'),

  // Misc Monitor Settings
  cacheBust: integer('cacheBust', { mode: 'boolean' }),
  screenshot: text('screenshot'),
  conditions: text('conditions'),
  includeSensitiveData: integer('includeSensitiveData', { mode: 'boolean' }),
  expiryNotification: integer('expiryNotification', { mode: 'boolean' }),

  // Timestamps
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`)
});

export const monitorsInsertSchema = createInsertSchema(monitors);
export const monitorsSelectSchema = createSelectSchema(monitors);
export type MonitorInsert = z.infer<typeof monitorsInsertSchema>;
export type Monitor = z.infer<typeof monitorsSelectSchema>;

export const monitorsRelations = relations(monitors, ({ many }) => ({
  heartbeats: many(heartbeats),
  monitorTags: many(monitorTags)
}));

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  color: text('color').notNull()
});

export const tagsInsertSchema = createInsertSchema(tags);
export const tagsSelectSchema = createSelectSchema(tags);

export type TagInsert = z.infer<typeof tagsInsertSchema>;
export type Tag = z.infer<typeof tagsSelectSchema>;

export const tagsRelations = relations(tags, ({ many }) => ({
  monitorTags: many(monitorTags)
}));

export const monitorTags = sqliteTable('monitor_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monitorId: integer('monitor_id')
    .notNull()
    .references(() => monitors.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
  value: text('value')
});

export const monitorTagsInsertSchema = createInsertSchema(monitorTags);
export const monitorTagsSelectSchema = createSelectSchema(monitorTags);

export type MonitorTagInsert = z.infer<typeof monitorTagsInsertSchema>;
export type MonitorTag = z.infer<typeof monitorTagsSelectSchema>;

export const monitorTagsRelations = relations(monitorTags, ({ one }) => ({
  monitor: one(monitors, {
    fields: [monitorTags.monitorId],
    references: [monitors.id]
  }),
  tag: one(tags, {
    fields: [monitorTags.tagId],
    references: [tags.id]
  })
}));

export const heartbeats = sqliteTable('heartbeats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  monitor_id: integer('monitor_id')
    .notNull()
    .references(() => monitors.id, { onDelete: 'cascade' }),
  down_count: integer('down_count').notNull(),
  duration: real('duration').notNull(),
  important: integer('important', { mode: 'boolean' }).notNull(),
  status: integer('status').notNull(),
  msg: text('msg').notNull(),
  ping: real('ping').notNull(),
  time: text('time').notNull()
});

export const heartbeatsInsertSchema = createInsertSchema(heartbeats);
export const heartbeatsSelectSchema = createSelectSchema(heartbeats);

export type HeartBeatInsert = z.infer<typeof heartbeatsInsertSchema>;
export type HeartBeat = z.infer<typeof heartbeatsSelectSchema>;

export const heartbeatsRelations = relations(heartbeats, ({ one }) => ({
  monitor: one(monitors, {
    fields: [heartbeats.monitor_id],
    references: [monitors.id]
  })
}));

export const info = sqliteTable('info', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  isContainer: integer('is_container', { mode: 'boolean' })
    .notNull()
    .default(false),
  latestVersion: text('latest_version').notNull(),
  primaryBaseURL: text('primary_base_url'),
  serverTimezone: text('server_timezone').notNull(),
  serverTimezoneOffset: text('server_timezone_offset').notNull(),
  version: text('version').notNull(),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`)
});

export const status = sqliteTable('status', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull().unique(),
  isExternal: integer('is_external', { mode: 'boolean' }).default(false),
  monitors: text('monitors'),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`)
});

export const credentials = sqliteTable('credentials', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  host: text('host').notNull().unique(),
  username: text('username').notNull(),
  password: text('password').notNull(),
  lastUsed: text('last_used')
    .notNull()
    .default(sql`(current_timestamp)`),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`)
});

export const monitorsIndexes = {
  activeIdx: `CREATE INDEX IF NOT EXISTS idx_monitors_active ON monitors (active)`,
  statusIdx: `CREATE INDEX IF NOT EXISTS idx_monitors_status ON monitors (status)`,
  nameIdx: `CREATE INDEX IF NOT EXISTS idx_monitors_name ON monitors (name)`
};

export const heartbeatsIndexes = {
  monitorTimeIdx: `CREATE INDEX IF NOT EXISTS idx_heartbeats_monitor_time ON heartbeats (monitor_id, time)`,
  importantIdx: `CREATE INDEX IF NOT EXISTS idx_heartbeats_important ON heartbeats (important)`,
  statusIdx: `CREATE INDEX IF NOT EXISTS idx_heartbeats_status ON heartbeats (status)`
};

// Helper type for monitor with relations
export type MonitorWithRelations = Monitor & {
  heartbeats: HeartBeat[];
  tags: Tag[];
};

export function mapDbHeartbeatToStore(heartbeat: HeartBeat): {
  id: number;
  status: number;
  time: string;
  msg: string;
  important: boolean;
  ping: number;
  duration: number;
  monitor_id: number;
} {
  return {
    id: heartbeat.id,
    status: heartbeat.status,
    time: heartbeat.time,
    msg: heartbeat.msg,
    important: heartbeat.important,
    ping: heartbeat.ping,
    duration: heartbeat.duration,
    monitor_id: heartbeat.monitor_id
  };
}

// Replace the existing MonitorDB type with this:
export type DrizzleMonitor = typeof monitors.$inferSelect;
export type DrizzleMonitorInsert = typeof monitors.$inferInsert;
