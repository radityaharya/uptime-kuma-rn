/* eslint-disable unused-imports/no-unused-vars */
import * as FileSystem from 'expo-file-system';
import { StorageAccessFramework } from 'expo-file-system';
import {
  consoleTransport,
  logger,
  type transportFunctionType,
} from 'react-native-logs';

import { checkAndGetPermissionGrantedFolderURI } from './fs';
import { sendNotificationImmediately } from './notification';

// Constants
const LOG_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024,
  MAX_FILES: 5,
  PREFIX: 'app-log',
} as const;

// Type definitions
export type LogLevel = {
  severity: number;
  text: string;
};

interface customTransportProps {
  [key: string]: any;
}

export interface LogEntry {
  level: LogLevel;
  msg: string;
  rawMsg: unknown;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface LogQueryParams {
  startDate?: Date;
  endDate?: Date;
  level?: LogLevel;
  limit?: number;
}

// Helper functions
const getLogFilePath = (date: Date): string => {
  const dateString = date.toISOString().split('T')[0];
  return `${LOG_CONFIG.PREFIX}-${dateString}.json`;
};

const ensureDirectoryExists = async () => {
  try {
    const docDir = FileSystem.documentDirectory;
    if (!docDir) {
      throw new Error('Document directory is not available');
    }

    const logDir = `${docDir}logs`;
    const dirInfo = await FileSystem.getInfoAsync(logDir);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(logDir, { intermediates: true });
    }
    return logDir;
  } catch (error) {
    console.error('Failed to ensure directory exists:', error);
    const fallbackDir = `${FileSystem.cacheDirectory}logs`;
    return fallbackDir;
  }
};

const cleanOldLogs = async (logDir: string) => {
  const files = await FileSystem.readDirectoryAsync(logDir);
  const logFiles = files
    .filter((file) => file.startsWith(LOG_CONFIG.PREFIX))
    .sort((a, b) => b.localeCompare(a));

  // Remove excess files
  while (logFiles.length > LOG_CONFIG.MAX_FILES) {
    const fileToDelete = logFiles.pop();
    if (fileToDelete) {
      await FileSystem.deleteAsync(`${logDir}/${fileToDelete}`);
    }
  }
};

const customFileTransport: transportFunctionType<customTransportProps> = async (
  props,
) => {
  try {
    const { level, msg, rawMsg } = props;
    const date = new Date();
    const logDir = await ensureDirectoryExists();

    if (!logDir) throw new Error('Could not create or access log directory');

    const logPath = `${logDir}/${getLogFilePath(date)}`;
    const logEntry: LogEntry = {
      level: level,
      msg,
      rawMsg,
      timestamp: date.toISOString(),
      metadata: {
        // @ts-ignore
        env: global.__DEV__ ? 'development' : 'production',
      },
    };

    let existingContent = '';
    const fileInfo = await FileSystem.getInfoAsync(logPath);

    if (fileInfo.exists) {
      if (fileInfo.size > LOG_CONFIG.MAX_SIZE) {
        const newPath = `${logPath}.${Date.now()}`;
        await FileSystem.moveAsync({ from: logPath, to: newPath });
      } else {
        existingContent = await FileSystem.readAsStringAsync(logPath);
      }
    }

    await FileSystem.writeAsStringAsync(
      logPath,
      existingContent + JSON.stringify(logEntry) + '\n',
      {
        encoding: FileSystem.EncodingType.UTF8,
      },
    );

    await cleanOldLogs(logDir);
  } catch (error) {
    console.error('File logging failed:', error);
    consoleTransport(props);
  }
};

export async function getLogs(
  params: LogQueryParams = {},
): Promise<LogEntry[]> {
  try {
    const logDir = await ensureDirectoryExists();
    const files = await FileSystem.readDirectoryAsync(logDir);
    const logFiles = files
      .filter((file) => file.startsWith(LOG_CONFIG.PREFIX))
      .sort((a, b) => b.localeCompare(a));

    let allLogs: any[] = [];
    for (const file of logFiles) {
      const content = await FileSystem.readAsStringAsync(`${logDir}/${file}`);
      const logs = content
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      allLogs = [...allLogs, ...logs];
    }

    let filteredLogs = allLogs.filter((log) => {
      const logDate = new Date(log.timestamp);
      if (params.startDate && logDate < params.startDate) return false;
      if (params.endDate && logDate > params.endDate) return false;
      if (params.level && log.level !== params.level) return false;
      return true;
    });

    if (params.limit) {
      filteredLogs = filteredLogs.slice(0, params.limit);
    }

    return filteredLogs;
  } catch (error) {
    console.error('Error getting logs:', error);
    return [];
  }
}

export async function clearLogs() {
  try {
    const logDir = await ensureDirectoryExists();
    const files = await FileSystem.readDirectoryAsync(logDir);
    const logFiles = files.filter((file) => file.startsWith(LOG_CONFIG.PREFIX));

    for (const file of logFiles) {
      await FileSystem.deleteAsync(`${logDir}/${file}`);
    }
  } catch (error) {
    console.error('Error clearing logs:', error);
  }
}

export async function exportLogs() {
  try {
    const logDir = await ensureDirectoryExists();
    if (!logDir) {
      console.error('Could not access log directory');
      return null;
    }

    const files = await FileSystem.readDirectoryAsync(logDir);
    const logFiles = files.filter((file) => file.startsWith(LOG_CONFIG.PREFIX));

    let allLogs: any[] = [];
    for (const file of logFiles) {
      const content = await FileSystem.readAsStringAsync(`${logDir}/${file}`);
      const logs = content
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      allLogs = [...allLogs, ...logs];
    }

    const logText = allLogs
      .map((log) => JSON.stringify(log, null, 2))
      .join('\n');

    const permissionUri = await checkAndGetPermissionGrantedFolderURI();
    if (!permissionUri) {
      console.error('Permission denied to write to downloads directory');
      return null;
    }

    const filename = `app-logs-${new Date().toISOString()}.json`;
    const fileUri = await StorageAccessFramework.createFileAsync(
      permissionUri,
      filename,
      'application/json',
    );

    await FileSystem.writeAsStringAsync(fileUri, logText, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    sendNotificationImmediately('Logs exported', `Logs exported to ${fileUri}`);

    return fileUri;
  } catch (error) {
    console.error('Error exporting logs:', error);
    return null;
  }
}

export const log = logger.createLogger({
  transport: [consoleTransport, customFileTransport],
  severity: 'debug', // Set default severity level
  transportOptions: {
    colors: {
      debug: 'blue',
      error: 'red',
      info: 'green',
      warn: 'yellow',
    },
  },
});

export function setLogLevel(level: LogLevel) {
  log.setSeverity(level.text);
}
