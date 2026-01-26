import AsyncStorage from '@react-native-async-storage/async-storage';
import CheckInService, { CheckIn } from './checkin.service';
import { SCHOOLS } from '@/config/aws-config';

export interface PickupStats {
  totalPickups: number;
  totalPickupsToday: number;
  onTimePickups: number;
  averageWaitTime: number; // in minutes
  fastestPickup: number; // in minutes
  slowestPickup: number; // in minutes
  pickupsBySchool: Record<string, number>;
  pickupsByHour: Record<string, number>;
  completionRate: number; // percentage
}

export interface DailyStats {
  date: string;
  totalCheckIns: number;
  completedPickups: number;
  averageWaitTime: number;
  onTimeRate: number;
}

export class StatsService {
  private static instance: StatsService;
  private readonly STORAGE_KEY = 'pickupStats';
  private readonly ON_TIME_THRESHOLD_MINUTES = 10; // Consider on-time if completed within 10 minutes

  private constructor() {}

  static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  /**
   * Get overall pickup statistics
   */
  async getPickupStats(schoolId?: string, dateRange?: { start: Date; end: Date }): Promise<PickupStats> {
    const allCheckIns = await CheckInService.getCheckIns(schoolId);
    
    // Get all check-ins including completed ones (not filtered by time)
    const allCheckInsData = await this.getAllCheckInsData();
    
    let filtered = allCheckInsData;
    
    if (schoolId) {
      filtered = filtered.filter((ci) => ci.schoolId === schoolId);
    }
    
    if (dateRange) {
      filtered = filtered.filter((ci) => {
        const checkInDate = new Date(ci.checkedInAt);
        return checkInDate >= dateRange.start && checkInDate <= dateRange.end;
      });
    }

    const completed = filtered.filter((ci) => ci.status === 'completed');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayCheckIns = filtered.filter((ci) => {
      const checkInDate = new Date(ci.checkedInAt);
      checkInDate.setHours(0, 0, 0, 0);
      return checkInDate.getTime() === today.getTime();
    });

    const todayCompleted = todayCheckIns.filter((ci) => ci.status === 'completed');

    // Calculate wait times
    const waitTimes = completed
      .filter((ci) => ci.waitTimeMinutes !== undefined)
      .map((ci) => ci.waitTimeMinutes!);

    const averageWaitTime = waitTimes.length > 0
      ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length)
      : 0;

    const fastestPickup = waitTimes.length > 0 ? Math.min(...waitTimes) : 0;
    const slowestPickup = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

    // On-time pickups (completed within threshold)
    const onTimePickups = completed.filter(
      (ci) => ci.waitTimeMinutes !== undefined && ci.waitTimeMinutes <= this.ON_TIME_THRESHOLD_MINUTES
    ).length;

    // Pickups by school
    const pickupsBySchool: Record<string, number> = {};
    completed.forEach((ci) => {
      pickupsBySchool[ci.schoolId] = (pickupsBySchool[ci.schoolId] || 0) + 1;
    });

    // Pickups by hour
    const pickupsByHour: Record<string, number> = {};
    completed.forEach((ci) => {
      const hour = new Date(ci.completedAt || ci.checkedInAt).getHours();
      const hourKey = `${hour}:00`;
      pickupsByHour[hourKey] = (pickupsByHour[hourKey] || 0) + 1;
    });

    // Completion rate
    const completionRate = filtered.length > 0
      ? Math.round((completed.length / filtered.length) * 100)
      : 0;

    return {
      totalPickups: completed.length,
      totalPickupsToday: todayCompleted.length,
      onTimePickups,
      averageWaitTime,
      fastestPickup,
      slowestPickup,
      pickupsBySchool,
      pickupsByHour,
      completionRate,
    };
  }

  /**
   * Get daily statistics for a date range
   */
  async getDailyStats(
    startDate: Date,
    endDate: Date,
    schoolId?: string
  ): Promise<DailyStats[]> {
    const allCheckIns = await this.getAllCheckInsData();
    
    let filtered = allCheckIns;
    if (schoolId) {
      filtered = filtered.filter((ci) => ci.schoolId === schoolId);
    }

    const statsByDate: Map<string, DailyStats> = new Map();

    // Initialize dates in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      statsByDate.set(dateKey, {
        date: dateKey,
        totalCheckIns: 0,
        completedPickups: 0,
        averageWaitTime: 0,
        onTimeRate: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Aggregate data
    filtered.forEach((checkIn) => {
      const checkInDate = new Date(checkIn.checkedInAt);
      const dateKey = checkInDate.toISOString().split('T')[0];
      
      if (statsByDate.has(dateKey)) {
        const stats = statsByDate.get(dateKey)!;
        stats.totalCheckIns++;
        
        if (checkIn.status === 'completed') {
          stats.completedPickups++;
        }
      }
    });

    // Calculate averages for each day
    statsByDate.forEach((stats, dateKey) => {
      const dayCheckIns = filtered.filter((ci) => {
        const ciDate = new Date(ci.checkedInAt).toISOString().split('T')[0];
        return ciDate === dateKey && ci.status === 'completed';
      });

      if (dayCheckIns.length > 0) {
        const waitTimes = dayCheckIns
          .filter((ci) => ci.waitTimeMinutes !== undefined)
          .map((ci) => ci.waitTimeMinutes!);

        if (waitTimes.length > 0) {
          stats.averageWaitTime = Math.round(
            waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
          );

          const onTimeCount = waitTimes.filter(
            (wt) => wt <= this.ON_TIME_THRESHOLD_MINUTES
          ).length;
          stats.onTimeRate = Math.round((onTimeCount / waitTimes.length) * 100);
        }
      }
    });

    return Array.from(statsByDate.values());
  }

  /**
   * Get all check-ins data (including completed ones)
   */
  private async getAllCheckInsData(): Promise<CheckIn[]> {
    try {
      const data = await AsyncStorage.getItem('pickupCheckIns');
      if (data) {
        const parsed = JSON.parse(data);
        return parsed.map((ci: any) => ({
          ...ci,
          checkedInAt: new Date(ci.checkedInAt),
          completedAt: ci.completedAt ? new Date(ci.completedAt) : undefined,
        }));
      }
      return [];
    } catch (error) {
      console.error('Get all check-ins data error:', error);
      return [];
    }
  }

  /**
   * Get top performing metrics
   */
  async getTopMetrics(schoolId?: string): Promise<{
    bestDay: { date: string; pickups: number };
    peakHour: { hour: string; pickups: number };
    bestSchool: { schoolId: string; pickups: number };
  }> {
    const stats = await this.getPickupStats(schoolId);
    
    // Find peak hour
    let peakHour = { hour: 'N/A', pickups: 0 };
    Object.entries(stats.pickupsByHour).forEach(([hour, count]) => {
      if (count > peakHour.pickups) {
        peakHour = { hour, pickups: count };
      }
    });

    // Find best school
    let bestSchool = { schoolId: 'N/A', pickups: 0 };
    Object.entries(stats.pickupsBySchool).forEach(([schoolId, count]) => {
      if (count > bestSchool.pickups) {
        bestSchool = { schoolId, pickups: count };
      }
    });

    // Get best day from last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const dailyStats = await this.getDailyStats(startDate, endDate, schoolId);
    let bestDay = { date: 'N/A', pickups: 0 };
    
    dailyStats.forEach((day) => {
      if (day.completedPickups > bestDay.pickups) {
        bestDay = { date: day.date, pickups: day.completedPickups };
      }
    });

    return { bestDay, peakHour, bestSchool };
  }

  /**
   * Clear all statistics
   */
  async clearStats(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Clear stats error:', error);
    }
  }
}

export default StatsService.getInstance();
