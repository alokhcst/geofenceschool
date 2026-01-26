import { SCHOOLS } from '@/config/aws-config';
import AuthService from '@/services/auth.service';
import CheckInService from '@/services/checkin.service';
import TokenService from '@/services/token.service';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

// Conditionally import expo-camera only for native platforms
let CameraView: any = null;
let CameraType: any = null;
let useCameraPermissions: any = null;
let isCameraAvailable = false;

if (Platform.OS !== 'web') {
  try {
    const Camera = require('expo-camera');
    if (Camera && Camera.CameraView && Camera.CameraType && Camera.useCameraPermissions) {
      CameraView = Camera.CameraView;
      CameraType = Camera.CameraType;
      useCameraPermissions = Camera.useCameraPermissions;
      isCameraAvailable = true;
      console.log('Camera module loaded successfully');
    } else {
      console.warn('expo-camera module incomplete:', { Camera });
    }
  } catch (error) {
    console.warn('expo-camera not available:', error);
    isCameraAvailable = false;
  }
} else {
  console.log('Running on web - camera not available');
}

interface ValidationResult {
  valid: boolean;
  studentInfo?: {
    studentId: string;
    userId: string;
    schoolId: string;
    timestamp?: string;
    version?: string;
  };
  error?: string;
  timestamp?: Date;
  scannedData?: string;
  tokenGeneratedAt?: Date;
  tokenExpiresAt?: Date;
}

export default function ValidatorScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  
  // Initialize camera permissions hook only if camera is available
  const cameraPermissionsHook = isCameraAvailable && useCameraPermissions ? useCameraPermissions() : null;
  const [permission, requestPermission] = cameraPermissionsHook 
    ? [cameraPermissionsHook[0], cameraPermissionsHook[1]]
    : [null, async () => ({ granted: false })];
  
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);

  const fetchDetails = useCallback(async (studentInfo: any) => {
    try {
      // In a real app, you would fetch this from the API
      // For now, we'll use mock data based on the studentInfo
      const user = await AuthService.getCurrentUser();
      
      // Find student details from user profile or mock
      if (user && user.students) {
        const student = user.students.find((s: any) => s.id === studentInfo.studentId);
        if (student) {
          setStudentDetails(student);
          setUserInfo(user);
        } else {
          // Mock student details if not found in user profile
          setStudentDetails({
            id: studentInfo.studentId,
            name: `Student ${studentInfo.studentId.slice(0, 8)}`,
            grade: 'Grade 5',
          });
          setUserInfo({
            id: studentInfo.userId,
            name: `User ${studentInfo.userId.slice(0, 8)}`,
            email: 'user@example.com',
          });
        }
      } else {
        // Mock data if user not found
        setStudentDetails({
          id: studentInfo.studentId,
          name: `Student ${studentInfo.studentId.slice(0, 8)}`,
          grade: 'Grade 5',
        });
        setUserInfo({
          id: studentInfo.userId,
          name: `User ${studentInfo.userId.slice(0, 8)}`,
          email: 'user@example.com',
        });
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      // Set mock data on error
      setStudentDetails({
        id: studentInfo.studentId,
        name: `Student ${studentInfo.studentId.slice(0, 8)}`,
        grade: 'Grade 5',
      });
      setUserInfo({
        id: studentInfo.userId,
        name: `User ${studentInfo.userId.slice(0, 8)}`,
        email: 'user@example.com',
      });
    }
  }, []);

  // Memoize the deep link token handler - MUST be defined before useEffect that uses it
  const handleDeepLinkToken = useCallback(async (tokenData: string) => {
    if (scanning) return;
    
    setScanning(true);
    try {
      // Decode URL-encoded token if needed
      const decodedToken = decodeURIComponent(tokenData);
      
      // Validate the token
      const result = await TokenService.validateToken(decodedToken);

      if (result.valid && result.studentInfo) {
        // Register check-in
        try {
          await CheckInService.registerCheckIn(
            result.studentInfo.userId,
            result.studentInfo.studentId,
            result.studentInfo.schoolId
          );
        } catch (error) {
          console.error('Check-in registration error:', error);
        }

        // Fetch additional user and student details
        await fetchDetails(result.studentInfo);
        
        // Calculate token expiration (15 minutes from generation)
        const tokenGeneratedAt = result.studentInfo.timestamp 
          ? new Date(result.studentInfo.timestamp) 
          : new Date();
        const tokenExpiresAt = new Date(tokenGeneratedAt.getTime() + 15 * 60 * 1000);
        
        setValidationResult({
          ...result,
          timestamp: new Date(),
          scannedData: decodedToken,
          tokenGeneratedAt,
          tokenExpiresAt,
        });
        setShowResult(true);
        setScanned(true);
      } else {
        setValidationResult({
          valid: false,
          error: result.error || 'Invalid token',
          timestamp: new Date(),
          scannedData: decodedToken,
        });
        setShowResult(true);
        setScanned(true);
      }
    } catch (error: any) {
      console.error('Deep link validation error:', error);
      setValidationResult({
        valid: false,
        error: error.message || 'Failed to validate token',
        timestamp: new Date(),
        scannedData: tokenData,
      });
      setShowResult(true);
      setScanned(true);
    } finally {
      setScanning(false);
    }
  }, [scanning, fetchDetails]);

  // Debug: Log camera availability
  useEffect(() => {
    console.log('Camera Status:', {
      platform: Platform.OS,
      isCameraAvailable,
      hasCameraView: !!CameraView,
      hasCameraType: !!CameraType,
      hasPermissionsHook: !!useCameraPermissions,
      permission: permission ? { granted: permission.granted, status: permission.status } : null,
    });
  }, [permission]);

  // Handle deep link when validator page is opened via URL with token parameter
  useEffect(() => {
    // Check if token is provided in URL params (from route)
    if (params.token) {
      console.log('Token found in URL params:', params.token);
      handleDeepLinkToken(params.token);
      return;
    }

    // Check if app was opened via deep link
    const checkInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          console.log('App opened with URL:', initialUrl);
          const parsed = Linking.parse(initialUrl);
          if (parsed.path === 'validator' && parsed.queryParams?.token) {
            const token = Array.isArray(parsed.queryParams.token)
              ? parsed.queryParams.token[0]
              : parsed.queryParams.token;
            if (token) {
              console.log('Token found in initial URL:', token);
              handleDeepLinkToken(token);
            }
          }
        }
      } catch (error) {
        console.error('Error checking initial URL:', error);
      }
    };

    checkInitialURL();

    // Listen for deep links while app is running
    const handleDeepLink = (event: { url: string }) => {
      console.log('Deep link received:', event.url);
      const parsed = Linking.parse(event.url);
      if (parsed.path === 'validator' && parsed.queryParams?.token) {
        const token = Array.isArray(parsed.queryParams.token)
          ? parsed.queryParams.token[0]
          : parsed.queryParams.token;
        if (token) {
          console.log('Token found in deep link:', token);
          handleDeepLinkToken(token);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [params.token, handleDeepLinkToken]);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || scanning) return;

    setScanned(true);
    setScanning(true);

    try {
      // Check if data is a deep link URL
      let tokenData = data;
      
      // If it's a URL, extract the token parameter
      if (data.startsWith('geofenceschool://') || data.includes('validator?token=')) {
        try {
          const url = new URL(data.replace('geofenceschool://', 'https://'));
          const tokenParam = url.searchParams.get('token');
          if (tokenParam) {
            tokenData = decodeURIComponent(tokenParam);
          }
        } catch (error) {
          // If URL parsing fails, try manual extraction
          const match = data.match(/[?&]token=([^&]+)/);
          if (match) {
            tokenData = decodeURIComponent(match[1]);
          }
        }
      }
      
      // Validate the scanned QR code data
      const result = await TokenService.validateToken(tokenData);

      if (result.valid && result.studentInfo) {
        // Register check-in
        try {
          await CheckInService.registerCheckIn(
            result.studentInfo.userId,
            result.studentInfo.studentId,
            result.studentInfo.schoolId
          );
        } catch (error) {
          console.error('Check-in registration error:', error);
          // Continue even if check-in registration fails
        }

        // Fetch additional user and student details
        await fetchDetails(result.studentInfo);
        
        // Calculate token expiration (15 minutes from generation)
        const tokenGeneratedAt = result.studentInfo.timestamp 
          ? new Date(result.studentInfo.timestamp) 
          : new Date();
        const tokenExpiresAt = new Date(tokenGeneratedAt.getTime() + 15 * 60 * 1000);
        
        setValidationResult({
          ...result,
          timestamp: new Date(),
          scannedData: data,
          tokenGeneratedAt,
          tokenExpiresAt,
        });
        setShowResult(true);
      } else {
        setValidationResult({
          valid: false,
          error: result.error || 'Invalid token',
          timestamp: new Date(),
          scannedData: data,
        });
        setShowResult(true);
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      setValidationResult({
        valid: false,
        error: error.message || 'Failed to validate token',
        timestamp: new Date(),
        scannedData: data,
      });
      setShowResult(true);
    } finally {
      setScanning(false);
    }
  };


  const handleScanAgain = () => {
    setScanned(false);
    setShowResult(false);
    setValidationResult(null);
    setUserInfo(null);
    setStudentDetails(null);
  };

  const handleClose = () => {
    setShowResult(false);
    setValidationResult(null);
    setUserInfo(null);
    setStudentDetails(null);
    router.back();
  };

  const getSchoolName = (schoolId: string): string => {
    const school = SCHOOLS.find(s => s.id === schoolId);
    return school ? school.name : 'Unknown School';
  };

  // On web, skip camera permission check
  if (Platform.OS === 'web') {
    // Web fallback - show manual input
  } else if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Requesting camera permission...</Text>
        </View>
      </View>
    );
  } else if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.icon}>📷</Text>
          <Text style={styles.title}>Camera Permission Required</Text>
          <Text style={styles.description}>
            We need camera access to scan barcodes and QR codes.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Barcode Validator</Text>
        <View style={styles.backButton} />
      </View>

      {!showResult && (
        <View style={styles.scannerContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.webScannerContainer}>
              <Text style={styles.webScannerTitle}>📷 Barcode Scanner</Text>
              <Text style={styles.webScannerDescription}>
                Camera scanning is not available on web. Please enter the QR code data manually:
              </Text>
              <TextInput
                style={styles.webScannerInput}
                placeholder="Paste QR code data here..."
                value={scanned ? '' : undefined}
                onChangeText={(text) => {
                  if (text && !scanned && !scanning) {
                    handleBarCodeScanned({ type: 'qr', data: text });
                  }
                }}
                editable={!scanned && !scanning}
                multiline
              />
              <Text style={styles.webScannerHint}>
                Tip: Use a mobile device for camera scanning
              </Text>
            </View>
          ) : isCameraAvailable && CameraView && CameraType ? (
            <CameraView
              style={styles.scanner}
              facing={CameraType.back}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.icon}>📷</Text>
              <Text style={styles.title}>Camera Not Available</Text>
              <Text style={styles.description}>
                The camera could not be initialized. Please check your device settings and try again.
              </Text>
              <Text style={styles.description}>
                Camera Available: {isCameraAvailable ? 'Yes' : 'No'}
                {'\n'}CameraView: {CameraView ? 'Yes' : 'No'}
                {'\n'}CameraType: {CameraType ? 'Yes' : 'No'}
                {'\n'}Platform: {Platform.OS}
              </Text>
            </View>
          )}
          <View style={styles.scannerOverlay}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanInstruction}>
              Position the QR code within the frame
            </Text>
          </View>
          {scanning && (
            <View style={styles.scanningOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.scanningText}>Validating...</Text>
            </View>
          )}
        </View>
      )}

      {showResult && validationResult && (
        <Modal
          visible={showResult}
          animationType="slide"
          transparent={false}
        >
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.resultContent}>
              {/* Validation Status */}
              <View style={[
                styles.statusCard,
                validationResult.valid ? styles.validCard : styles.invalidCard
              ]}>
                <Text style={styles.statusIcon}>
                  {validationResult.valid ? '✅' : '❌'}
                </Text>
                <Text style={[
                  styles.statusText,
                  validationResult.valid ? styles.validText : styles.invalidText
                ]}>
                  {validationResult.valid ? 'Valid Token' : 'Invalid Token'}
                </Text>
                {validationResult.error && (
                  <Text style={styles.errorText}>{validationResult.error}</Text>
                )}
              </View>

              {/* Student Information */}
              {validationResult.valid && validationResult.studentInfo && (
                <>
                  <View style={styles.detailsCard}>
                    <Text style={styles.detailsTitle}>Student Information</Text>
                    {studentDetails ? (
                      <>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Name:</Text>
                          <Text style={styles.detailValue}>{studentDetails.name}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Grade:</Text>
                          <Text style={styles.detailValue}>{studentDetails.grade}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Student ID:</Text>
                          <Text style={styles.detailValue}>{validationResult.studentInfo.studentId}</Text>
                        </View>
                      </>
                    ) : (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Student ID:</Text>
                        <Text style={styles.detailValue}>{validationResult.studentInfo.studentId}</Text>
                      </View>
                    )}
                  </View>

                  {/* School Information */}
                  <View style={styles.detailsCard}>
                    <Text style={styles.detailsTitle}>School Information</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>School:</Text>
                      <Text style={styles.detailValue}>
                        {getSchoolName(validationResult.studentInfo.schoolId)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>School ID:</Text>
                      <Text style={styles.detailValue}>{validationResult.studentInfo.schoolId}</Text>
                    </View>
                  </View>

                  {/* Parent/User Information */}
                  {userInfo && (
                    <View style={styles.detailsCard}>
                      <Text style={styles.detailsTitle}>Parent Information</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Name:</Text>
                        <Text style={styles.detailValue}>{userInfo.name}</Text>
                      </View>
                      {userInfo.email && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Email:</Text>
                          <Text style={styles.detailValue}>{userInfo.email}</Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>User ID:</Text>
                        <Text style={styles.detailValue}>{validationResult.studentInfo.userId}</Text>
                      </View>
                    </View>
                  )}

                  {/* Timestamp */}
                  {validationResult.timestamp && (
                    <View style={styles.detailsCard}>
                      <Text style={styles.detailsTitle}>Scan Details</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Scanned At:</Text>
                        <Text style={styles.detailValue}>
                          {validationResult.timestamp.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Raw Data (for debugging) */}
              {validationResult.scannedData && (
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsTitle}>Raw Data</Text>
                  <Text style={styles.rawData} numberOfLines={5}>
                    {validationResult.scannedData.substring(0, 100)}
                    {validationResult.scannedData.length > 100 ? '...' : ''}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.scanAgainButton]}
                onPress={handleScanAgain}
              >
                <Text style={styles.scanAgainButtonText}>Scan Again</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.closeButton]}
                onPress={handleClose}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  backButton: {
    padding: 8,
    minWidth: 60,
  },
  backText: {
    fontSize: 16,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#fff',
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanInstruction: {
    marginTop: 40,
    fontSize: 16,
    color: '#fff',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12,
    borderRadius: 8,
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    marginTop: 16,
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  resultHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
    fontWeight: '300',
  },
  resultContent: {
    flex: 1,
    padding: 20,
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  validCard: {
    backgroundColor: '#E8F5E9',
  },
  invalidCard: {
    backgroundColor: '#FFEBEE',
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  validText: {
    color: '#4CAF50',
  },
  invalidText: {
    color: '#F44336',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  rawData: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  resultActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  scanAgainButton: {
    backgroundColor: '#007AFF',
  },
  scanAgainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webScannerContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  webScannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  webScannerDescription: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  webScannerInput: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  webScannerHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
