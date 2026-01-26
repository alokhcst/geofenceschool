import { SCHOOLS, USE_MOCK_MODE } from '@/config/aws-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService, { StudentInfo } from './auth.service';
import NotificationService from './notification.service';

export interface CheckIn {
  id: string;
  userId: string;
  studentId: string;
  schoolId: string;
  parentName: string;
  studentName: string;
  studentGrade: string;
  checkedInAt: Date;
  completedAt?: Date;
  status: 'waiting' | 'processing' | 'completed';
  tokenId?: string;
  waitTimeMinutes?: number; // Time from check-in to completion
}

export class CheckInService {
  private static instance: CheckInService;
  private checkIns: CheckIn[] = [];
  private readonly STORAGE_KEY = 'pickupCheckIns';

  private constructor() {
    // Only load check-ins if we're in a browser/client environment
    // Skip during SSR to avoid "window is not defined" errors
    if (typeof window !== 'undefined') {
      // Client-side: safe to load
      this.loadCheckIns();
    }
    // During SSR (window is undefined), skip loading - will load on first access
  }

  static getInstance(): CheckInService {
    if (!CheckInService.instance) {
      CheckInService.instance = new CheckInService();
    }
    return CheckInService.instance;
  }

  /**
   * Register a check-in when a token is validated
   */
  async registerCheckIn(
    userId: string,
    studentId: string,
    schoolId: string,
    tokenId?: string
  ): Promise<CheckIn> {
    try {
      // Check if already checked in (prevent duplicates)
      const existing = this.checkIns.find(
        (ci) => ci.userId === userId && ci.studentId === studentId && ci.status !== 'completed'
      );

      if (existing) {
        // Update existing check-in
        existing.checkedInAt = new Date();
        existing.status = 'waiting';
        await this.saveCheckIns();
        return existing;
      }

      // Fetch user and student details
      const userDetails = await this.fetchUserDetails(userId, studentId);

      const checkIn: CheckIn = {
        id: `checkin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        studentId,
        schoolId,
        parentName: userDetails.parentName,
        studentName: userDetails.studentName,
        studentGrade: userDetails.studentGrade,
        checkedInAt: new Date(),
        status: 'waiting',
        tokenId,
      };

      this.checkIns.push(checkIn);
      await this.saveCheckIns();

      // In production, register with backend
      if (!USE_MOCK_MODE) {
        await this.registerWithBackend(checkIn);
      }

      return checkIn;
    } catch (error) {
      console.error('Register check-in error:', error);
      throw error;
    }
  }

  /**
   * Get all check-ins sorted by arrival time
   */
  async getCheckIns(schoolId?: string): Promise<CheckIn[]> {
    await this.loadCheckIns();
    
    let filtered = [...this.checkIns];
    
    if (schoolId) {
      filtered = filtered.filter((ci) => ci.schoolId === schoolId);
    }

    // Filter out completed check-ins older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    filtered = filtered.filter(
      (ci) => ci.status !== 'completed' || new Date(ci.checkedInAt) > oneHourAgo
    );

    // Sort by arrival time (oldest first)
    return filtered.sort(
      (a, b) => new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime()
    );
  }

  /**
   * Update check-in status
   */
  async updateCheckInStatus(
    checkInId: string,
    status: 'waiting' | 'processing' | 'completed'
  ): Promise<void> {
    const checkIn = this.checkIns.find((ci) => ci.id === checkInId);
    if (checkIn) {
      const previousStatus = checkIn.status;
      checkIn.status = status;

      // Track completion time and calculate wait time
      if (status === 'completed' && !checkIn.completedAt) {
        checkIn.completedAt = new Date();
        const waitTimeMs = checkIn.completedAt.getTime() - checkIn.checkedInAt.getTime();
        checkIn.waitTimeMinutes = Math.round(waitTimeMs / (1000 * 60));
      }

      await this.saveCheckIns();

      // Send notifications when pickup is completed
      if (status === 'completed' && previousStatus !== 'completed') {
        await this.sendPickupNotifications(checkIn);
      }

      if (!USE_MOCK_MODE) {
        await this.updateStatusInBackend(checkInId, status);
      }
    }
  }

  /**
   * Send pickup confirmation notifications
   */
  private async sendPickupNotifications(checkIn: CheckIn): Promise<void> {
    try {
      const school = SCHOOLS.find((s) => s.id === checkIn.schoolId);
      const schoolName = school?.name || checkIn.schoolId;
      const pickupTime = checkIn.completedAt || new Date();

      // Send notification to parent
      await NotificationService.sendPickupConfirmationToParent(
        checkIn.studentName,
        schoolName,
        pickupTime
      );

      // Send notification to school/admin
      await NotificationService.sendPickupNotificationToSchool(
        checkIn.parentName,
        checkIn.studentName,
        checkIn.studentGrade,
        schoolName,
        pickupTime
      );
    } catch (error) {
      console.error('Send pickup notifications error:', error);
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Remove a check-in
   */
  async removeCheckIn(checkInId: string): Promise<void> {
    this.checkIns = this.checkIns.filter((ci) => ci.id !== checkInId);
    await this.saveCheckIns();
  }

  /**
   * Clear all check-ins
   */
  async clearAllCheckIns(): Promise<void> {
    this.checkIns = [];
    await this.saveCheckIns();
  }

  /**
   * Get check-in count
   */
  getCheckInCount(schoolId?: string): number {
    let filtered = this.checkIns;
    if (schoolId) {
      filtered = filtered.filter((ci) => ci.schoolId === schoolId);
    }
    return filtered.filter((ci) => ci.status !== 'completed').length;
  }

  /**
   * Fetch user and student details
   */
  private async fetchUserDetails(
    userId: string,
    studentId: string
  ): Promise<{
    parentName: string;
    studentName: string;
    studentGrade: string;
  }> {
    try {
      // Try to get from current user first
      const currentUser = await AuthService.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        const student = currentUser.students?.find((s: StudentInfo) => s.id === studentId);
        if (student) {
          return {
            parentName: currentUser.name,
            studentName: student.name,
            studentGrade: student.grade,
          };
        }
      }

      // In production, fetch from API
      if (!USE_MOCK_MODE) {
        // const response = await fetch(`/api/user/${userId}/student/${studentId}`);
        // const data = await response.json();
        // return data;
      }

      // Mock data fallback
      return {
        parentName: 'Parent Name',
        studentName: 'Student Name',
        studentGrade: 'Grade Unknown',
      };
    } catch (error) {
      console.error('Fetch user details error:', error);
      return {
        parentName: 'Unknown Parent',
        studentName: 'Unknown Student',
        studentGrade: 'Unknown',
      };
    }
  }

  /**
   * Load check-ins from storage
   */
  private async loadCheckIns(): Promise<void> {
    try {
      // Skip AsyncStorage access during SSR
      if (typeof window === 'undefined') {
        return;
      }
      
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Convert date strings back to Date objects
        this.checkIns = parsed.map((ci: any) => ({
          ...ci,
          checkedInAt: new Date(ci.checkedInAt),
        }));
      }
    } catch (error) {
      console.error('Load check-ins error:', error);
      this.checkIns = [];
    }
  }

  /**
   * Save check-ins to storage
   */
  private async saveCheckIns(): Promise<void> {
    try {
      // Skip AsyncStorage access during SSR
      if (typeof window === 'undefined') {
        return;
      }
      
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.checkIns));
    } catch (error) {
      console.error('Save check-ins error:', error);
    }
  }

  /**
   * Register check-in with backend
   */
  private async registerWithBackend(checkIn: CheckIn): Promise<void> {
    // Backend API call would go here
    console.log('Registering check-in with backend:', checkIn.id);
  }

  /**
   * Update status in backend
   */
  private async updateStatusInBackend(
    checkInId: string,
    status: string
  ): Promise<void> {
    // Backend API call would go here
    console.log('Updating check-in status in backend:', checkInId, status);
  }
}

export default CheckInService.getInstance();
