import { useRouter } from 'expo-router';
import { useState } from 'react';
import { toast } from 'sonner-native';

import { log } from '@/lib/log';
import { type MonitorFormData, type Tag } from '@/schemas/monitor';
import { clientStore } from '@/store/clientStore';
import { monitorStore } from '@/store/monitorStore';

type MonitorMutationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'error'; error: Error };

async function checkMonitorTagMutation(
  monitorId: number,
  tags: Tag[]
): Promise<void> {
  const monitor = monitorStore.getMonitor(monitorId);
  const client = clientStore.getClient();
  if (!monitor || !client) return;

  const currentTags = monitor.tags.map((tag) => tag.id);
  const newTags = tags.map((tag) => tag.id);

  const tagsToAdd = newTags.filter((tag) => !currentTags.includes(tag));
  const tagsToDelete = currentTags.filter((tag) => !newTags.includes(tag));

  log.debug('Tags to add:', tagsToAdd);
  log.debug('Tags to delete:', tagsToDelete);

  // TODO: Fix sending multiple tags

  await Promise.all([
    ...tagsToAdd.map((tagId) => client.addMonitorTag(monitorId, tagId)),
    ...tagsToDelete.map((tagId) => client.deleteMonitorTag(monitorId, tagId))
  ]);
}
export const useMonitorMutation = (isNewMonitor: boolean) => {
  const [state, setState] = useState<MonitorMutationState>({ status: 'idle' });
  const client = clientStore.getClient();
  if (!client) {
    throw new Error('Client not found');
  }
  const router = useRouter();

  const mutateMonitor = async (data: MonitorFormData) => {
    setState({ status: 'loading' });

    try {
      if (isNewMonitor) {
        await client.addMonitor(data);
        toast.success('Monitor Created');
      } else {
        await checkMonitorTagMutation(data.id!, data.tags);
        await client.editMonitor(data);
        toast.success('Monitor Updated');
      }

      setState({ status: 'success' });
      router.back();
    } catch (error) {
      const errorMessage = isNewMonitor
        ? 'Error creating monitor'
        : 'Error updating monitor';
      console.error(
        `Monitor ${isNewMonitor ? 'creation' : 'update'} error:`,
        error
      );
      toast.error(errorMessage);
      setState({
        status: 'error',
        error: error instanceof Error ? error : new Error(errorMessage)
      });
    }
  };

  return { mutateMonitor, state };
};
