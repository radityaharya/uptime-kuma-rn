import { useEffect, useState } from 'react';

import { getLogs, type LogEntry } from '@/lib/log';

export const useLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const fetchLogs = async () => {
    const logs = await getLogs();
    setLogs(
      logs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    );
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return { logs, refresh: fetchLogs };
};