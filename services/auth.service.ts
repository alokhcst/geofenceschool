import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser, fetchAuthSession, signInWithRedirect } from 'aws-amplify/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { awsConfig, USE_MOCK_MODE } from '@/config/aws-config';

// Initialize Amplify (only in production mode)
if (!USE_MOCK_MODE) {
  Amplify.configure(awsConfig);
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  students: StudentInfo[];
  vehicle?: VehicleInfo;
}

export interface StudentInfo {
  id: string;
  name: string;
  grade: string;
  schoolId: string;
}

export interface VehicleInfo {
  make: string;
  model: string;
  color: string;
  licensePlate: string;
}

export class AuthService {
  private static instance: AuthService;
  private currentUser: UserProfile | null = null;

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<UserProfile> {
    try {
      if (USE_MOCK_MODE) {
        // Mock authentication for development
        const mockUser: UserProfile = {
          id: 'mock-user-123',
          email,
          name: 'John Doe',
          phone: '+1234567890',
          students: [
            {
              id: 'student-1',
              name: 'Jane Doe',
              grade: '3rd',
              schoolId: 'school-1',
            },
          ],
          vehicle: {
            make: 'Toyota',
            model: 'Camry',
            color: 'Blue',
            licensePlate: 'ABC123',
          },
        };
        
        await this.saveUserToStorage(mockUser);
        this.currentUser = mockUser;
        return mockUser;
      }

      // Real AWS Cognito authentication
      const { isSignedIn } = await signIn({ username: email, password });
      
      if (isSignedIn) {
        const user = await this.fetchUserProfile();
        return user;
      }

      throw new Error('Sign in failed');
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle(): Promise<void> {
    try {
      if (USE_MOCK_MODE) {
        // Mock Google sign-in
        const mockUser: UserProfile = {
          id: 'google-user-456',
          email: 'user@gmail.com',
          name: 'Google User',
          students: [],
          vehicle: undefined,
        };
        
        await this.saveUserToStorage(mockUser);
        this.currentUser = mockUser;
        return;
      }

      // Real Google OAuth via Cognito
      await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      if (!USE_MOCK_MODE) {
        await signOut();
      }
      
      await AsyncStorage.removeItem('userProfile');
      this.currentUser = null;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      if (this.currentUser) {
        return this.currentUser;
      }

      // Check AsyncStorage first
      const cachedUser = await this.getUserFromStorage();
      if (cachedUser) {
        this.currentUser = cachedUser;
        return cachedUser;
      }

      if (USE_MOCK_MODE) {
        return null;
      }

      // Fetch from AWS
      const user = await getCurrentUser();
      if (user) {
        const profile = await this.fetchUserProfile();
        return profile;
      }

      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Fetch user profile from backend
   */
  private async fetchUserProfile(): Promise<UserProfile> {
    try {
      // In production, this would call your API Gateway endpoint
      // For now, return mock data
      const session = await fetchAuthSession();
      const userId = session.userSub || 'unknown';

      const profile: UserProfile = {
        id: userId,
        email: 'user@example.com',
        name: 'User Name',
        students: [],
      };

      await this.saveUserToStorage(profile);
      this.currentUser = profile;
      return profile;
    } catch (error) {
      console.error('Fetch user profile error:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }

      const updatedUser = { ...this.currentUser, ...updates };
      await this.saveUserToStorage(updatedUser);
      this.currentUser = updatedUser;

      // In production, sync with backend
      if (!USE_MOCK_MODE) {
        // await API call to update user profile
      }

      return updatedUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }

  /**
   * Add student to user profile
   */
  async addStudent(student: StudentInfo): Promise<void> {
    try {
      if (!this.currentUser) {
        throw new Error('No user signed in');
      }

      const updatedStudents = [...this.currentUser.students, student];
      await this.updateProfile({ students: updatedStudents });
    } catch (error) {
      console.error('Add student error:', error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Get auth token for API calls
   */
  async getAuthToken(): Promise<string | null> {
    try {
      if (USE_MOCK_MODE) {
        return 'mock-auth-token-' + Date.now();
      }

      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.error('Get auth token error:', error);
      return null;
    }
  }

  // Storage helpers
  private async saveUserToStorage(user: UserProfile): Promise<void> {
    await AsyncStorage.setItem('userProfile', JSON.stringify(user));
  }

  private async getUserFromStorage(): Promise<UserProfile | null> {
    const data = await AsyncStorage.getItem('userProfile');
    return data ? JSON.parse(data) : null;
  }
}

export default AuthService.getInstance();

