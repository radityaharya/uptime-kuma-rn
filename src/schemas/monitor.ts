import { z } from 'zod';

export const monitorTypeEnum = z.enum([
  'http',
  'ping',
  'port',
  'dns',
  'docker',
  'mysql',
  'postgres',
  'mongodb',
  'mqtt',
  'json-query',
  'group',
  'keyword',
  'mp-health',
  'real-browser',
  'gamedig',
  'grpc-keyword',
  'push',
  'radius',
  'redis',
  'sqlserver',
  'steam',
  'rabbitmq',
  'kafka-producer',
  'tailscale-ping',
  'snmp'
]) satisfies z.ZodType<string>;

const HeartBeatSchema = z.object({
  id: z.number(),
  monitor_id: z.number(),
  down_count: z.number(),
  duration: z.number(),
  important: z.union([z.boolean(), z.number()]),
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

const TagSchema = z.preprocess(
  (data: any) => {
    if (data.tag_id !== undefined) {
      data.id = data.tag_id;
    }
    return data;
  },
  z.object({
    id: z.number().optional(),
    monitor_id: z.number().optional(),
    tag_id: z.number().optional(),
    value: z.string().optional(),
    name: z.string(),
    color: z.string()
  })
);

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
  description: z.string().nullable().optional(),
  pathName: z.string().optional(),
  active: z.boolean().default(true),
  forceInactive: z.boolean().default(false),
  status: z.string().optional(),
  tags: z.array(TagSchema).optional().default([]),
  weight: z.number().default(1),
  parent: z.number().nullable().optional(),
  childrenIDs: z.array(z.number()).default([]),

  interval: z.preprocess(
    (value) => parseInt(value as string, 10),
    z.number().min(20)
  ),
  timeout: z.number().optional(),
  maxretries: z.number().min(0).max(100),
  retryInterval: z.number().min(10),
  resendInterval: z.number().min(0),
  upsideDown: z.boolean().default(false),
  notificationIDList: z.record(z.any()),
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
  headers: z.preprocess((val) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
    return val;
  }, z.record(z.string()).nullable().optional()),
  body: z.string().nullable().optional(),
  httpBodyEncoding: z.string().optional(),
  ignoreTls: z.boolean().optional(),
  maxredirects: z.number().optional(),
  proxyId: z.number().nullable().optional(),
  authMethod: z.string().nullable().optional(),
  basic_auth_user: z.string().nullable().optional(),
  basic_auth_pass: z.string().nullable().optional(),
  accepted_statuscodes: z.array(z.string()).optional(),
  tlsCert: z.string().nullable().optional(),
  tlsKey: z.string().nullable().optional(),
  tlsCa: z.string().nullable().optional(),
  oauth_auth_method: z.string().nullable().optional(),
  oauth_token_url: z.string().nullable().optional(),
  oauth_client_id: z.string().nullable().optional(),
  oauth_client_secret: z.string().nullable().optional(),
  oauth_scopes: z.string().nullable().optional(),
  authDomain: z.string().nullable().optional(),
  authWorkstation: z.string().nullable().optional()
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
  dns_resolve_type: z.string(),
  port: z.number().min(1).max(65535).optional()
});

const dockerMonitor = baseMonitorSchema.extend({
  type: z.literal('docker'),
  docker_host: z.string().nullable(),
  docker_container: z.string()
});

const databaseMonitor = baseMonitorSchema.extend({
  type: z.enum(['mysql', 'postgres', 'mongodb', 'sqlserver']),
  databaseConnectionString: z.string(),
  databaseQuery: z.string().nullable().optional(),
  radiusPassword: z.string().optional().nullable()
});

const mqttMonitor = baseMonitorSchema.extend({
  type: z.literal('mqtt'),
  mqttUsername: z.string().nullable(),
  mqttPassword: z.string().nullable(),
  mqttTopic: z.string(),
  mqttSuccessMessage: z.string(),
  mqttCheckType: z.enum(['keyword', 'json-query']).default('keyword'),
  jsonPath: z.string().optional(),
  expectedValue: z.string().optional()
});

const jsonQueryMonitor = baseMonitorSchema.extend({
  type: z.literal('json-query'),
  url: z.string().optional(),
  jsonPath: z.string(),
  jsonPathOperator: z.string().optional(),
  expectedValue: z.string().optional()
});

const keywordMonitor = baseMonitorSchema.extend({
  type: z.literal('keyword'),
  url: z.string().optional(),
  keyword: z.string(),
  invertKeyword: z.boolean().optional()
});

const mpHealthMonitor = baseMonitorSchema.extend({
  type: z.literal('mp-health'),
  url: z.string()
});

const realBrowserMonitor = baseMonitorSchema.extend({
  type: z.literal('real-browser'),
  url: z.string().url(),
  browser_width: z.number().optional(),
  browser_height: z.number().optional(),
  remote_browser: z.number().nullable()
});

const gamedigMonitor = baseMonitorSchema.extend({
  type: z.literal('gamedig'),
  game: z.string(),
  hostname: z.string(),
  port: z.number().min(1).max(65535),
  gamedigGivenPortOnly: z.boolean().default(true)
});

const grpcKeywordMonitor = baseMonitorSchema.extend({
  type: z.literal('grpc-keyword'),
  grpcUrl: z.string(),
  keyword: z.string(),
  grpcProtobuf: z.string().nullable().optional(),
  grpcServiceName: z.string().nullable().optional(),
  grpcMethod: z.string().nullable().optional(),
  grpcBody: z.string().nullable().optional(),
  grpcMetadata: z.string().nullable().optional(),
  grpcEnableTls: z.boolean().default(false)
});

const pushMonitor = baseMonitorSchema.extend({
  type: z.literal('push'),
  pushToken: z.string()
});

const radiusMonitor = baseMonitorSchema.extend({
  type: z.literal('radius'),
  hostname: z.string(),
  radius_secret: z.string(),
  radiusUsername: z.string().optional(),
  radiusPassword: z.string().optional(),
  radiusCalledStationId: z.string().optional(),
  radiusCallingStationId: z.string().optional(),
  port: z.number().min(1).max(65535).optional()
});

const redisMonitor = baseMonitorSchema.extend({
  type: z.literal('redis'),
  databaseConnectionString: z.string()
});

const steamMonitor = baseMonitorSchema.extend({
  type: z.literal('steam'),
  hostname: z.string(),
  port: z.number().min(1).max(65535)
});

const rabbitmqMonitor = baseMonitorSchema.extend({
  type: z.literal('rabbitmq'),
  rabbitmqNodes: z.array(z.string()),
  rabbitmqUsername: z.string(),
  rabbitmqPassword: z.string()
});

const kafkaProducerMonitor = baseMonitorSchema.extend({
  type: z.literal('kafka-producer'),
  kafkaProducerBrokers: z.array(z.string()),
  kafkaProducerTopic: z.string(),
  kafkaProducerMessage: z.string(),
  kafkaProducerSsl: z.boolean().default(false),
  kafkaProducerSaslOptions: z.object({
    mechanism: z.string().default('None'),
    username: z.string().optional(),
    password: z.string().optional(),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    sessionToken: z.string().optional(),
    authorizationIdentity: z.string().optional()
  }),
  kafkaProducerAllowAutoTopicCreation: z.boolean().default(false)
});

const tailscalePingMonitor = baseMonitorSchema.extend({
  type: z.literal('tailscale-ping'),
  hostname: z.string().min(1)
});

const snmpMonitor = baseMonitorSchema.extend({
  type: z.literal('snmp'),
  hostname: z.string().min(1),
  radiusPassword: z.string().nullable().optional(),
  snmpOid: z.string(),
  snmpVersion: z.enum(['1', '2c']).default('2c'),
  port: z.number().min(1).max(65535).optional(),
  jsonPath: z.string().optional(),
  jsonPathOperator: z.string().optional(),
  expectedValue: z.string().optional()
});

const groupMonitor = baseMonitorSchema.extend({
  type: z.literal('group')
});

export const monitorFormSchema = z.discriminatedUnion('type', [
  httpMonitor,
  pingMonitor,
  portMonitor,
  dnsMonitor,
  dockerMonitor,
  databaseMonitor,
  mqttMonitor,
  jsonQueryMonitor,
  groupMonitor,
  keywordMonitor,
  mpHealthMonitor,
  realBrowserMonitor,
  gamedigMonitor,
  grpcKeywordMonitor,
  pushMonitor,
  radiusMonitor,
  redisMonitor,
  steamMonitor,
  rabbitmqMonitor,
  kafkaProducerMonitor,
  tailscalePingMonitor,
  snmpMonitor
]);

const monitorSchema = z.union([
  baseMonitorSchema,
  httpMonitor,
  pingMonitor,
  portMonitor,
  dnsMonitor,
  dockerMonitor,
  databaseMonitor,
  mqttMonitor,
  jsonQueryMonitor,
  keywordMonitor,
  mpHealthMonitor,
  realBrowserMonitor,
  gamedigMonitor,
  grpcKeywordMonitor,
  pushMonitor,
  radiusMonitor,
  redisMonitor,
  steamMonitor,
  rabbitmqMonitor,
  kafkaProducerMonitor,
  tailscalePingMonitor,
  snmpMonitor
]);

export type MonitorUnion = z.infer<typeof monitorSchema>;
export type MonitorFormData = z.infer<typeof monitorFormSchema>;
export type Monitor = z.infer<typeof monitorFormSchema>;
export type MonitorType = z.infer<typeof monitorTypeEnum>;
