import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { SCHOOLS } from '@/config/aws-config';

const GEOFENCE_TASK = 'GEOFENCE_BACKGROUND_TASK';

export interface GeofenceRegion {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export class GeofencingService {
  private static instance: GeofencingService;
  private isMonitoring = false;
  private currentRegions: GeofenceRegion[] = [];

  private constructor() {}

  static getInstance(): GeofencingService {
    if (!GeofencingService.instance) {
      GeofencingService.instance = new GeofencingService();
    }
    return GeofencingService.instance;
  }

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Request foreground permissions
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.log('Foreground permission not granted');
        return false;
      }

      // Request background permissions for continuous monitoring
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.log('Background permission not granted');
        // Still return true as foreground is sufficient for basic functionality
        return true;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      // Check permissions first
      const { status } = await Location.getForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      return location;
    } catch (error) {
      console.log('Could not get current location:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Check if current location is inside any geofence
   */
  async checkGeofenceEntry(): Promise<{
    isInside: boolean;
    school?: any;
    distance?: number;
  }> {
    const location = await this.getCurrentLocation();
    
    if (!location) {
      return { isInside: false };
    }

    for (const school of SCHOOLS) {
      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        school.geofence.latitude,
        school.geofence.longitude
      );

      if (distance <= school.geofence.radius) {
        return {
          isInside: true,
          school,
          distance,
        };
      }
    }

    return { isInside: false };
  }

  /**
   * Start monitoring geofences
   */
  async startMonitoring(regions: GeofenceRegion[]): Promise<boolean> {
    try {
      const hasPermissions = await this.requestPermissions();
      
      if (!hasPermissions) {
        return false;
      }

      this.currentRegions = regions;
      
      // Define the background task
      TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
        if (error) {
          console.error('Geofence task error:', error);
          return;
        }

        if (data) {
          const { locations } = data as any;
          const location = locations[0];

          if (location) {
            await this.handleLocationUpdate(location);
          }
        }
      });

      // Start location updates
      await Location.startLocationUpdatesAsync(GEOFENCE_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 30000, // Update every 30 seconds
        distanceInterval: 50, // Update every 50 meters
        foregroundService: {
          notificationTitle: 'School Pickup Active',
          notificationBody: 'Monitoring your location for school pickup',
          notificationColor: '#E6F4FE',
        },
      });

      this.isMonitoring = true;
      console.log('Geofence monitoring started');
      return true;
    } catch (error) {
      console.error('Error starting geofence monitoring:', error);
      return false;
    }
  }

  /**
   * Stop monitoring geofences
   */
  async stopMonitoring(): Promise<void> {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(GEOFENCE_TASK);
      
      if (isRegistered) {
        await Location.stopLocationUpdatesAsync(GEOFENCE_TASK);
      }
      
      this.isMonitoring = false;
      console.log('Geofence monitoring stopped');
    } catch (error) {
      console.error('Error stopping geofence monitoring:', error);
    }
  }

  /**
   * Handle location update from background task
   */
  private async handleLocationUpdate(location: Location.LocationObject): Promise<void> {
    for (const region of this.currentRegions) {
      const distance = this.calculateDistance(
        location.coords.latitude,
        location.coords.longitude,
        region.latitude,
        region.longitude
      );

      if (distance <= region.radius) {
        console.log(`Entered geofence: ${region.name}`);
        await this.triggerGeofenceNotification(region);
      }
    }
  }

  /**
   * Trigger notification when entering geofence
   */
  private async triggerGeofenceNotification(region: GeofenceRegion): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎒 Approaching School Pickup',
        body: `You're near ${region.name}. Tap to show your pickup code.`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { schoolId: region.id, type: 'geofence_entry' },
      },
      trigger: null, // Send immediately
    });
  }

  /**
   * Check if monitoring is active
   */
  isMonitoringActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Get monitored regions
   */
  getMonitoredRegions(): GeofenceRegion[] {
    return this.currentRegions;
  }
}

export default GeofencingService.getInstance();

