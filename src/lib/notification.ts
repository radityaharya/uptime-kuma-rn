/* eslint-disable import/namespace */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { toast } from 'sonner-native';

import { log } from '@/lib/log';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export async function schedulePushNotification(
  title: string,
  body: string,
  data?: any
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {}
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1
    }
  });
}

export async function sendNotificationImmediately(
  title: string,
  body: string,
  data?: {
    monitorId?: number;
    timestamp?: number;
    [key: string]: any;
  }
) {
  try {
    const timestamp = Date.now();
    log.info('Sending notification:', { title, body, data, timestamp });

    toast.success(body);

    const result = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          ...data,
          timestamp,
          url: data?.monitorId ? `/(app)/(monitors)/${data.monitorId}` : null
        }
      },
      trigger: null
    });

    log.info('Notification sent successfully:', result);
  } catch (error) {
    log.error('Failed to send notification:', error);
    throw error;
  }
}

export async function cancelAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
    log.info('All notifications cleared');
  } catch (error) {
    log.error('Failed to clear notifications:', error);
  }
}

export async function registerForPushNotificationsAsync() {
  log.info('Registering for push notifications');
  let token;

  if (Platform.OS === 'android') {
    const channelResult = await Notifications.setNotificationChannelAsync(
      'default',
      {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C'
      }
    );
    log.debug('Android notification channel created:', channelResult);
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    log.debug('Existing notification permission status:', existingStatus);

    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      log.info('Requesting notification permissions');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      log.debug('New notification permission status:', status);
    }

    if (finalStatus !== 'granted') {
      log.warn('Failed to get notification permissions');
      return null;
    }
  }

  return token;
}

export function handleNotificationResponse(
  response: Notifications.NotificationResponse
) {
  const url = response.notification.request.content.data?.url;
  if (url) {
    log.info('Navigating to:', url);
    router.push(url as any);
  }
}
