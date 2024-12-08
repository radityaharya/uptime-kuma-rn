import { type Monitor } from '../types';

export interface StatusPageConfig {
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
}

export interface StatusPageMonitor
  extends Omit<Monitor, 'heartBeatList' | 'importantHeartBeatList' | 'uptime'> {
  status: string;
  heartBeatList: HeartbeatData[];
  uptime: number;
}

export interface MonitorGroup {
  id: number;
  name: string;
  weight: number;
  monitorList: StatusPageMonitor[];
}

export interface StatusPageData {
  config: StatusPageConfig;
  incident: any | null;
  publicGroupList: MonitorGroup[];
  maintenanceList: any[];
}

export interface HeartbeatData {
  status: number;
  time: string;
  msg: string;
  ping: number;
}

export interface StatusApiResponse {
  heartbeatList: Record<string, HeartbeatData[]>;
  uptimeList: Record<string, number>;
}
