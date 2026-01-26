import AsyncStorage from '@react-native-async-storage/async-storage';
import { USE_MOCK_MODE } from '@/config/aws-config';
import AuthService from './auth.service';
import { encode as base64Encode, decode as base64Decode } from 'base-64';

export interface PickupToken {
  id: string;
  userId: string;
  studentId: string;
  schoolId: string;
  generatedAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  qrCodeData: string;
}

export class TokenService {
  private static instance: TokenService;
  private currentToken: PickupToken | null = null;

  private constructor() {}

  static getInstance(): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService();
    }
    return TokenService.instance;
  }

  /**
   * Generate pickup authorization token
   */
  async generateToken(
    studentId: string,
    schoolId: string
  ): Promise<PickupToken> {
    try {
      const user = await AuthService.getCurrentUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Check if user is authorized for current day/time
      const isAuthorized = await this.checkAuthorization(user.id, studentId, schoolId);
      
      if (!isAuthorized) {
        throw new Error('Not authorized for pickup at this time');
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

      // Generate QR code data (must be URL format)
      const qrData = await this.generateQRCodeData(user.id, studentId, schoolId, now);
      
      // Verify the QR code data is in URL format
      if (!qrData.startsWith('geofenceschool://')) {
        console.error('ERROR: QR code data is not in URL format!', qrData.substring(0, 50));
        throw new Error('Failed to generate QR code URL');
      }

      const token: PickupToken = {
        id: this.generateTokenId(),
        userId: user.id,
        studentId,
        schoolId,
        generatedAt: now,
        expiresAt,
        isUsed: false,
        qrCodeData: qrData,
      };
      
      console.log('Token generated with QR URL:', qrData.substring(0, 80) + '...');

      // Store token
      await this.saveToken(token);
      this.currentToken = token;

      // In production, call backend API to register token
      if (!USE_MOCK_MODE) {
        await this.registerTokenWithBackend(token);
      }

      return token;
    } catch (error) {
      console.error('Generate token error:', error);
      throw error;
    }
  }

  /**
   * Generate QR code data string
   */
  private async generateQRCodeData(
    userId: string,
    studentId: string,
    schoolId: string,
    timestamp: Date
  ): Promise<string> {
    const authToken = await AuthService.getAuthToken();
    
    // Create token payload
    const payload = {
      userId,
      studentId,
      schoolId,
      timestamp: timestamp.toISOString(),
      authToken: authToken || 'mock-token',
      version: '1.0',
    };

    // In production, this would be cryptographically signed
    // For now, just encode as JSON
    const qrData = JSON.stringify(payload);
    
    // Base64 encode for QR code (React Native compatible)
    const base64Data = base64Encode(qrData);
    
    // Create deep link URL that opens validator page when scanned
    // Format: geofenceschool://validator?token=<base64data>
    const deepLinkUrl = `geofenceschool://validator?token=${encodeURIComponent(base64Data)}`;
    
    // Log the generated URL for debugging
    console.log('Generated QR Code URL:', deepLinkUrl);
    console.log('URL length:', deepLinkUrl.length);
    
    // Return the deep link URL so scanning opens the validator page
    // The validator will extract the token from the URL
    return deepLinkUrl;
  }

  /**
   * Get current active token
   */
  async getCurrentToken(): Promise<PickupToken | null> {
    try {
      if (this.currentToken && !this.isTokenExpired(this.currentToken)) {
        return this.currentToken;
      }

      // Try to load from storage
      const storedToken = await this.loadToken();
      
      if (storedToken && !this.isTokenExpired(storedToken)) {
        this.currentToken = storedToken;
        return storedToken;
      }

      return null;
    } catch (error) {
      console.error('Get current token error:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: PickupToken): boolean {
    return new Date() > new Date(token.expiresAt);
  }

  /**
   * Invalidate current token
   */
  async invalidateToken(): Promise<void> {
    if (this.currentToken) {
      this.currentToken.isUsed = true;
      await this.saveToken(this.currentToken);
      
      if (!USE_MOCK_MODE) {
        // Notify backend
        await this.markTokenAsUsed(this.currentToken.id);
      }
    }
    
    this.currentToken = null;
    await AsyncStorage.removeItem('currentPickupToken');
  }

  /**
   * Check if user is authorized for pickup
   */
  private async checkAuthorization(
    userId: string,
    studentId: string,
    schoolId: string
  ): Promise<boolean> {
    try {
      if (USE_MOCK_MODE) {
        // Mock: check time window (e.g., 2:30 PM - 3:30 PM)
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // Allow pickup between 14:30 and 15:30 for demo
        // In production, this would check the actual schedule
        return true; // Always allow in mock mode
      }

      // In production, call backend API to verify authorization
      const authToken = await AuthService.getAuthToken();
      
      // API call would go here
      // const response = await fetch('/api/check-authorization', ...);
      
      return true;
    } catch (error) {
      console.error('Check authorization error:', error);
      return false;
    }
  }

  /**
   * Validate a scanned token (for scanner app)
   */
  async validateToken(qrCodeData: string): Promise<{
    valid: boolean;
    studentInfo?: any;
    error?: string;
  }> {
    try {
      let tokenData = qrCodeData;
      
      // If it's a deep link URL, extract the token parameter
      if (qrCodeData.startsWith('geofenceschool://') || qrCodeData.includes('validator?token=')) {
        try {
          // Handle deep link URL format: geofenceschool://validator?token=<data>
          const urlString = qrCodeData.replace('geofenceschool://', 'https://');
          const url = new URL(urlString);
          const tokenParam = url.searchParams.get('token');
          if (tokenParam) {
            tokenData = decodeURIComponent(tokenParam);
          } else {
            // Try manual extraction if URL parsing fails
            const match = qrCodeData.match(/[?&]token=([^&]+)/);
            if (match) {
              tokenData = decodeURIComponent(match[1]);
            }
          }
        } catch (error) {
          // If URL parsing fails, try manual extraction
          const match = qrCodeData.match(/[?&]token=([^&]+)/);
          if (match) {
            tokenData = decodeURIComponent(match[1]);
          }
          // If no match, use original data (might be raw base64)
        }
      }
      
      // Decode QR data (React Native compatible)
      const decoded = base64Decode(tokenData);
      const payload = JSON.parse(decoded);

      // Check expiration
      const timestamp = new Date(payload.timestamp);
      const now = new Date();
      const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);

      if (diffMinutes > 15) {
        return { valid: false, error: 'Token expired' };
      }

      // In production, verify with backend
      if (!USE_MOCK_MODE) {
        // const response = await fetch('/api/validate-token', ...);
      }

      return {
        valid: true,
        studentInfo: {
          studentId: payload.studentId,
          userId: payload.userId,
          schoolId: payload.schoolId,
          timestamp: payload.timestamp,
          version: payload.version,
        },
      };
    } catch (error) {
      console.error('Validate token error:', error);
      return { valid: false, error: 'Invalid token format' };
    }
  }

  // Private helpers
  private generateTokenId(): string {
    return `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveToken(token: PickupToken): Promise<void> {
    await AsyncStorage.setItem('currentPickupToken', JSON.stringify(token));
  }

  private async loadToken(): Promise<PickupToken | null> {
    const data = await AsyncStorage.getItem('currentPickupToken');
    return data ? JSON.parse(data) : null;
  }

  private async registerTokenWithBackend(token: PickupToken): Promise<void> {
    // Backend API call would go here
    console.log('Registering token with backend:', token.id);
  }

  private async markTokenAsUsed(tokenId: string): Promise<void> {
    // Backend API call would go here
    console.log('Marking token as used:', tokenId);
  }
}

export default TokenService.getInstance();

