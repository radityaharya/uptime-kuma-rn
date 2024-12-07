/* eslint-disable import/namespace */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function schedulePushNotification(
  title: string,
  body: string,
  data?: any,
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1,
    },
  });
}

export async function sendNotificationImmediately(
  title: string,
  body: string,
  data?: any,
) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
    },
    trigger: null,
  });
}
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }
  }

  return token;
}
