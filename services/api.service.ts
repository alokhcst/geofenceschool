import axios, { AxiosInstance } from 'axios';
import { awsConfig, USE_MOCK_MODE } from '@/config/aws-config';
import AuthService from './auth.service';

class APIService {
  private static instance: APIService;
  private api: AxiosInstance;

  private constructor() {
    this.api = axios.create({
      baseURL: awsConfig.API.REST.GeofenceAPI.endpoint,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AuthService.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, redirect to login
          await AuthService.signOut();
        }
        return Promise.reject(error);
      }
    );
  }

  static getInstance(): APIService {
    if (!APIService.instance) {
      APIService.instance = new APIService();
    }
    return APIService.instance;
  }

  /**
   * Generate pickup token
   */
  async generateToken(studentId: string, schoolId: string): Promise<any> {
    if (USE_MOCK_MODE) {
      // Mock response
      return {
        tokenId: `token-${Date.now()}`,
        studentId,
        schoolId,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };
    }

    const response = await this.api.post('/token/generate', {
      studentId,
      schoolId,
    });
    return response.data;
  }

  /**
   * Validate token (for scanner app)
   */
  async validateToken(tokenId: string): Promise<any> {
    if (USE_MOCK_MODE) {
      return {
        valid: true,
        studentId: 'student-123',
        userId: 'user-123',
      };
    }

    const response = await this.api.post('/token/validate', { tokenId });
    return response.data;
  }

  /**
   * Get user profile
   */
  async getUserProfile(): Promise<any> {
    if (USE_MOCK_MODE) {
      return null;
    }

    const response = await this.api.get('/user/profile');
    return response.data;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(updates: any): Promise<any> {
    if (USE_MOCK_MODE) {
      return updates;
    }

    const response = await this.api.put('/user/profile', updates);
    return response.data;
  }

  /**
   * Get user's pickup schedule
   */
  async getSchedule(userId: string): Promise<any> {
    if (USE_MOCK_MODE) {
      return [];
    }

    const response = await this.api.get(`/user/${userId}/schedule`);
    return response.data;
  }

  /**
   * Update pickup schedule
   */
  async updateSchedule(scheduleData: any): Promise<any> {
    if (USE_MOCK_MODE) {
      return scheduleData;
    }

    const response = await this.api.put('/user/schedule', scheduleData);
    return response.data;
  }

  /**
   * Get schools list
   */
  async getSchools(): Promise<any> {
    if (USE_MOCK_MODE) {
      return [];
    }

    const response = await this.api.get('/schools');
    return response.data;
  }

  /**
   * Get school geofences
   */
  async getGeofences(): Promise<any> {
    if (USE_MOCK_MODE) {
      return [];
    }

    const response = await this.api.get('/schools/geofences');
    return response.data;
  }

  /**
   * Register push notification token
   */
  async registerPushToken(expoPushToken: string): Promise<void> {
    if (USE_MOCK_MODE) {
      return;
    }

    await this.api.post('/user/push-token', { token: expoPushToken });
  }

  /**
   * Add student to user profile
   */
  async addStudent(studentData: any): Promise<any> {
    if (USE_MOCK_MODE) {
      return studentData;
    }

    const response = await this.api.post('/user/students', studentData);
    return response.data;
  }

  /**
   * Remove student from user profile
   */
  async removeStudent(studentId: string): Promise<void> {
    if (USE_MOCK_MODE) {
      return;
    }

    await this.api.delete(`/user/students/${studentId}`);
  }
}

export default APIService.getInstance();

