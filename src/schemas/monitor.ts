import { z } from 'zod';

const monitorTypeEnum = z.enum([
  'http',
  'ping',
  'port',
  'dns',
  'docker',
  'mysql',
  'postgres',
  'mongodb',
  'radius',
  'redis',
  'grpc',
  'kafka',
  'mqtt',
  'sqlserver',
  'gamedig',
  'smtp'
]);

const HeartBeatSchema = z.object({
  id: z.number(),
  monitor_id: z.number(),
  down_count: z.number(),
  duration: z.number(),
  important: z.number(),
  status: z.number(),
  msg: z.string(),
  ping: z.number(),
  time: z.string()
});

export type HeartBeat = z.infer<typeof HeartBeatSchema>;

const ImportantHeartBeatSchema = HeartBeatSchema.omit({
  id: true,
  monitor_id: true,
  down_count: true
}).extend({
  monitorID: z.number()
});

export type ImportantHeartBeat = z.infer<typeof ImportantHeartBeatSchema>;

const TagSchema = z.object({
  id: z.number(),
  monitor_id: z.number(),
  tag_id: z.number(),
  value: z.string(),
  name: z.string(),
  color: z.string()
});

export type Tag = z.infer<typeof TagSchema>;

const UptimeSchema = z.object({
  day: z.number(),
  month: z.number(),
  // v2_compatibility
  year: z.number().optional()
});

const baseMonitorSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Name is required'),
  type: monitorTypeEnum,
  description: z.string().nullable(),
  pathName: z.string().optional(),
  active: z.boolean().default(true),
  forceInactive: z.boolean().default(false),
  status: z.string().optional(),
  tags: z.array(TagSchema).optional().default([]),
  weight: z.number().default(1),
  parent: z.number().optional(),
  childrenIDs: z.array(z.number()).default([]),

  interval: z.preprocess(
    (value) => parseInt(value as string, 10),
    z.number().min(20)
  ),
  timeout: z.number().min(1).max(180),
  maxretries: z.number().min(0).max(100),
  retryInterval: z.number().min(10),
  resendInterval: z.number().min(0),
  upsideDown: z.boolean().default(false),
  notificationIDList: z.record(z.any()), // TODO: Add notification schema
  maintenance: z.boolean().default(false),

  // extended fields
  heartBeatList: z.array(HeartBeatSchema).optional(),
  importantHeartBeatList: z.array(ImportantHeartBeatSchema).optional(),
  uptime: UptimeSchema.optional(),
  avgPing: z.number().optional(),

  isUp: z.boolean().optional()
});

const httpMonitor = baseMonitorSchema.extend({
  type: z.literal('http'),
  url: z.string().url('Invalid URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH']),
  headers: z.record(z.string()).nullable().optional(),
  body: z.string().nullable().optional(),
  httpBodyEncoding: z.string().optional(),
  ignoreTls: z.boolean().optional(),
  maxredirects: z.number().optional(),
  proxyId: z.number().nullable().optional(),
  authMethod: z.string().nullable().optional(),
  basic_auth_user: z.string().nullable().optional(),
  basic_auth_pass: z.string().nullable().optional()
});

export type HttpMonitorFormData = z.infer<typeof httpMonitor>;

const pingMonitor = baseMonitorSchema.extend({
  type: z.literal('ping'),
  hostname: z.string().min(1),
  packetSize: z.number().optional()
});

const portMonitor = baseMonitorSchema.extend({
  type: z.literal('port'),
  hostname: z.string().min(1),
  port: z.number().min(1).max(65535)
});

const dnsMonitor = baseMonitorSchema.extend({
  type: z.literal('dns'),
  hostname: z.string().min(1),
  dns_resolve_server: z.string(),
  dns_resolve_type: z.string()
});

const dockerMonitor = baseMonitorSchema.extend({
  type: z.literal('docker'),
  docker_host: z.string().nullable(),
  docker_container: z.string()
});

const databaseMonitor = baseMonitorSchema.extend({
  type: z.enum(['mysql', 'postgres', 'mongodb']),
  databaseConnectionString: z.string(),
  databaseQuery: z.string().nullable().optional()
});

const mqttMonitor = baseMonitorSchema.extend({
  type: z.literal('mqtt'),
  mqttUsername: z.string(),
  mqttPassword: z.string(),
  mqttTopic: z.string(),
  mqttSuccessMessage: z.string()
});

export const monitorFormSchema = z.discriminatedUnion('type', [
  httpMonitor,
  pingMonitor,
  portMonitor,
  dnsMonitor,
  dockerMonitor,
  databaseMonitor,
  mqttMonitor
]);

export type MonitorFormData = z.infer<typeof monitorFormSchema>;
export type Monitor = z.infer<typeof monitorFormSchema>;
export type MonitorType = z.infer<typeof monitorTypeEnum>;
