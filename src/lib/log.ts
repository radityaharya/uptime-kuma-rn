type LogLevel = 'log' | 'debug' | 'error';
type LogEntry = {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
};

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private readonly maxLogs: number = 200;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private addLog(level: LogLevel, message: string, data?: any) {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    this.logs.unshift(logEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    const timestamp = logEntry.timestamp.toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage, data || '');
        break;
      case 'error':
        console.error(logMessage, data || '');
        break;
      default:
        console.log(logMessage, data || '');
    }
  }

  public log(message: string, data?: any): void {
    this.addLog('log', message, data);
  }

  public debug(message: string, data?: any): void {
    this.addLog('debug', message, data);
  }

  public error(message: string, data?: any): void {
    this.addLog('error', message, data);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }
}

export const logger = Logger.getInstance();