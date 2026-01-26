import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification system and request permissions
   */
  async initialize(): Promise<boolean> {
    try {
      // Request permissions
      const hasPermission = await this.requestPermissions();
      
      if (!hasPermission) {
        console.log('Notification permissions not granted');
        return false;
      }

      // Get push token
      await this.registerForPushNotifications();

      // Set up notification categories with actions
      await this.setupNotificationCategories();

      return true;
    } catch (error) {
      console.error('Notification initialization error:', error);
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  private async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Request permissions error:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get Expo push token
   */
  private async registerForPushNotifications(): Promise<string | null> {
    try {
      // Skip push notifications on web
      if (Platform.OS === 'web') {
        console.log('Push notifications not available on web');
        return null;
      }

      if (!Device.isDevice) {
        console.log('Must use physical device for push notifications');
        return null;
      }

      // Skip if projectId is not configured (placeholder value)
      // In production, this should be set to a valid Expo project ID
      const projectId = 'your-expo-project-id';
      if (projectId === 'your-expo-project-id' || !projectId) {
        console.log('Expo project ID not configured. Skipping push token registration.');
        return null;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      this.expoPushToken = token.data;
      // Only save to storage if window is available (not during SSR)
      if (typeof window !== 'undefined') {
        await AsyncStorage.setItem('expoPushToken', token.data);
      }

      // Configure Android channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'School Pickup Notifications',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E6F4FE',
        });
      }

      console.log('Push token:', token.data);
      return token.data;
    } catch (error) {
      // Silently handle push notification errors - they're not critical for app functionality
      console.log('Push notification registration skipped:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Set up notification categories with action buttons
   */
  private async setupNotificationCategories(): Promise<void> {
    await Notifications.setNotificationCategoryAsync('geofence_entry', [
      {
        identifier: 'show_code',
        buttonTitle: 'Show Pickup Code',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: {
          opensAppToForeground: false,
        },
      },
    ]);
  }

  /**
   * Send local notification for geofence entry
   */
  async sendGeofenceNotification(schoolName: string, schoolId: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎒 Approaching School Pickup',
          body: `You're near ${schoolName}. Tap to show your pickup code.`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'geofence_entry',
          data: {
            type: 'geofence_entry',
            schoolId,
            timestamp: new Date().toISOString(),
          },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Send geofence notification error:', error);
    }
  }

  /**
   * Send pickup reminder notification
   */
  async sendPickupReminder(
    studentName: string,
    pickupTime: string,
    schoolName: string
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Pickup Reminder',
          body: `Don't forget to pick up ${studentName} from ${schoolName} at ${pickupTime}`,
          sound: true,
          data: {
            type: 'pickup_reminder',
            studentName,
            pickupTime,
          },
        },
        trigger: null,
      });
    } catch (error) {
      console.error('Send pickup reminder error:', error);
    }
  }

  /**
   * Schedule notification for specific time
   */
  async scheduleNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: any
  ): Promise<string | null> {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          data: data || {},
        },
        trigger: {
          date: triggerDate,
        },
      });

      return identifier;
    } catch (error) {
      console.error('Schedule notification error:', error);
      return null;
    }
  }

  /**
   * Cancel scheduled notification
   */
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.error('Cancel notification error:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Cancel all notifications error:', error);
    }
  }

  /**
   * Get Expo push token
   */
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Add notification received listener
   */
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  /**
   * Remove notification listeners
   */
  removeNotificationSubscription(subscription: Notifications.Subscription): void {
    Notifications.removeNotificationSubscription(subscription);
  }

  /**
   * Get all scheduled notifications
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Get all scheduled notifications error:', error);
      return [];
    }
  }

  /**
   * Clear notification badge
   */
  async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Clear badge error:', error);
    }
  }

  /**
   * Send pickup confirmation notification to parent
   */
  async sendPickupConfirmationToParent(
    studentName: string,
    schoolName: string,
    pickupTime: Date
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Pickup Confirmed',
          body: `${studentName} has been successfully picked up from ${schoolName} at ${pickupTime.toLocaleTimeString()}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: 'pickup_confirmation',
            studentName,
            schoolName,
            pickupTime: pickupTime.toISOString(),
          },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Send pickup confirmation to parent error:', error);
    }
  }

  /**
   * Send pickup notification to school/admin
   */
  async sendPickupNotificationToSchool(
    parentName: string,
    studentName: string,
    studentGrade: string,
    schoolName: string,
    pickupTime: Date
  ): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📋 Pickup Completed',
          body: `${parentName} picked up ${studentName} (${studentGrade}) from ${schoolName}`,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: 'pickup_school_notification',
            parentName,
            studentName,
            studentGrade,
            schoolName,
            pickupTime: pickupTime.toISOString(),
          },
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Send pickup notification to school error:', error);
    }
  }
}

export default NotificationService.getInstance();

