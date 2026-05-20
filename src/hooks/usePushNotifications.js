import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const isExpoGo = Constants.appOwnership === 'expo';

export function usePushNotifications(navigationRef) {
  useEffect(() => {
    if (!isExpoGo) register();

    // Handle notification taps — navigate to the relevant event
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const { event_id } = response.notification.request.content.data ?? {};
      if (event_id && navigationRef?.current) {
        navigationRef.current.navigate('Main', {
          screen: 'EventDetail',
          params: { eventId: event_id },
        });
      }
    });

    return () => sub.remove();
  }, []);

  async function register() {
    if (!Device.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync();
    const { data: { user } } = await supabase.auth.getUser();

    if (user && token) {
      await supabase.from('push_tokens').upsert(
        { user_id: user.id, token },
        { onConflict: 'user_id,token' }
      );
    }
  }
}
