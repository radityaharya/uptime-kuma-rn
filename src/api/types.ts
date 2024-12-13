export type PaginateQuery<T> = {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
};

export type Info = {
  isContainer: boolean;
  latestVersion: string;
  primaryBaseURL: string | null;
  serverTimezone: string;
  serverTimezoneOffset: string;
  version: string;
};

export type HeartBeat = {
  id: number;
  monitor_id: number;
  down_count: number;
  duration: number;
  important: number;
  status: number;
  msg: string;
  ping: number;
  time: Date;
};

export type ImportantHeartBeat = Omit<
  HeartBeat,
  'id' | 'monitor_id' | 'down_count'
> & {
  monitorID: number;
};

export type Tag = {
  id: number;
  monitor_id: number;
  tag_id: number;
  value: string;
  name: string;
  color: string;
};

export type Uptime = {
  day: number;
  month: number;
  // v2_compatibility
  year?: number;
};

export type Monitor = {
  // Basic Info
  id: number;
  name: string;
  type: string;
  url: string;
  description: string | null;
  pathName: string;
  active: boolean;
  forceInactive: boolean;
  maintenance: boolean;
  status?: string;
  tags: Tag[];
  weight: number;
  parent: number | null;
  childrenIDs: number[];

  // Monitoring Settings
  interval: number;
  timeout: number;
  maxretries: number;
  retryInterval: number;
  resendInterval: number;
  method?: string;
  upsideDown: boolean;
  maxredirects: number;
  accepted_statuscodes?: string[];
  includeSensitiveData: boolean;

  // HTTP/HTTPS Settings
  headers: Record<string, string> | null;
  body: string | null;
  httpBodyEncoding: string;
  ignoreTls: boolean;
  keyword?: string | null;
  invertKeyword: boolean;
  jsonPath: string | null;

  // Authentication
  authMethod: string | null;
  authDomain: string | null;
  authWorkstation: string | null;
  basic_auth_user: string | null;
  basic_auth_pass: string | null;

  // OAuth Settings
  oauth_auth_method: string;
  oauth_client_id: string | null;
  oauth_client_secret: string | null;
  oauth_token_url: string | null;
  oauth_scopes: string | null;

  // TLS/SSL Settings
  tlsCa: string | null;
  tlsCert: string | null;
  tlsKey: string | null;

  // DNS Settings
  dns_resolve_server: string;
  dns_resolve_type: string;
  dns_last_result: string | null;

  // Docker Settings
  docker_container: string;
  docker_host: string | null;

  // Database Settings
  databaseConnectionString: string | null;
  databaseQuery: string | null;

  // MQTT Settings
  mqttUsername: string;
  mqttPassword: string;
  mqttTopic: string;
  mqttSuccessMessage: string;

  // RADIUS Settings
  radiusUsername: string | null;
  radiusPassword: string | null;
  radiusSecret: string | null;
  radiusCalledStationId: string | null;
  radiusCallingStationId: string | null;

  // Kafka Settings
  kafkaProducerBrokers: string[];
  kafkaProducerTopic: string | null;
  kafkaProducerMessage: string | null;
  kafkaProducerSsl: boolean;
  kafkaProducerAllowAutoTopicCreation: boolean;
  kafkaProducerSaslOptions: {
    mechanism: string;
  };

  // gRPC Settings
  grpcUrl: string | null;
  grpcProtobuf: string | null;
  grpcServiceName: string | null;
  grpcMethod: string | null;
  grpcBody: string | null;
  grpcMetadata: string | null;
  grpcEnableTls: boolean;

  // Game Server Settings
  game: string | null;
  gamedigGivenPortOnly: boolean;
  port: number | null;

  // Notification Settings
  notificationIDList: Record<string, any>;
  expiryNotification: boolean;

  // Miscellaneous
  screenshot: string | null;
  pushToken: string | null;
  proxyId: number | null;
  expectedValue: string | null;
  hostname: string | null;
  packetSize: number;

  heartBeatList?: HeartBeat[];
  importantHeartBeatList?: ImportantHeartBeat[];
  uptime?: Uptime;
  avgPing?: number;

  isUp?: boolean;
};

export type StatusPage = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  icon: string;
  theme: string;
  published: boolean;
  showTags: boolean;
  customCSS: string;
  footerText: string | null;
  showPoweredBy: boolean;
  googleAnalyticsId: string | null;
  showCertificateExpiry: boolean;
};

export type UptimeKumaEvent =
  | 'updateMonitorIntoList'
  | 'deleteMonitorFromList'
  | 'monitorTypeList'
  | 'maintenanceList'
  | 'apiKeyList'
  | 'notificationList'
  | 'statusPageList'
  | 'proxyList'
  | 'dockerHostList'
  | 'remoteBrowserList'
  | 'heartbeat'
  | 'heartbeatList'
  | 'avgPing'
  | 'uptime'
  | 'disconnect'
  | 'certInfo'
  | 'monitorList';

export type EventPayloads = {
  [K in UptimeKumaEvent]: any;
};
