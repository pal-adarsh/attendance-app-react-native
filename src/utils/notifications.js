import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const REMINDER_ENABLED_KEY = '@attendance_reminder_enabled';
export const REMINDER_HOUR_1 = 17;
export const REMINDER_MINUTE_1 = 0;
export const REMINDER_HOUR_2 = 22;
export const REMINDER_MINUTE_2 = 0;

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('attendance-reminder', {
            name: 'Attendance Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 100, 50, 100],
        });
    }
    return true;
};

export const scheduleReminders = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return false;

    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Attendance Reminder',
            body: "Don't forget to mark today's attendance!",
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            channelId: 'attendance-reminder',
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: REMINDER_HOUR_1,
            minute: REMINDER_MINUTE_1,
        },
    });

    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Last Chance Reminder',
            body: 'Mark your attendance for today before you forget!',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            channelId: 'attendance-reminder',
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: REMINDER_HOUR_2,
            minute: REMINDER_MINUTE_2,
        },
    });

    return true;
};

export const cancelReminders = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
};

export const isReminderEnabled = async () => {
    try {
        const val = await AsyncStorage.getItem(REMINDER_ENABLED_KEY);
        if (val === null) return true;
        return val === 'true';
    } catch (e) {
        return true;
    }
};

export const setReminderEnabled = async (enabled) => {
    try {
        await AsyncStorage.setItem(REMINDER_ENABLED_KEY, String(enabled));
        if (enabled) {
            await scheduleReminders();
        } else {
            await cancelReminders();
        }
    } catch (e) {
        console.error('Failed to set reminder', e);
    }
};
