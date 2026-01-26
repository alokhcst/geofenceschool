import QRCodeDisplay from '@/components/qr-code-display';
import AuthService from '@/services/auth.service';
import TokenService, { PickupToken } from '@/services/token.service';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PickupScreen() {
  const [loading, setLoading] = useState(false);
  const [currentToken, setCurrentToken] = useState<PickupToken | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
    checkExistingToken();
  }, []);

  const loadUser = async () => {
    const currentUser = await AuthService.getCurrentUser();
    setUser(currentUser);
  };

  const checkExistingToken = async () => {
    const token = await TokenService.getCurrentToken();
    if (token) {
      setCurrentToken(token);
      setShowQRCode(true);
    }
  };

  const handleGenerateCode = async () => {
    if (!user || !user.students || user.students.length === 0) {
      Alert.alert(
        'No Students',
        'Please add a student to your profile first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Student', onPress: () => router.push('/auth/profile-setup') },
        ]
      );
      return;
    }

    // If multiple students, show picker (simplified for now)
    const student = user.students[0];
    const schoolId = student.schoolId || 'school-1';

    setLoading(true);
    try {
      const token = await TokenService.generateToken(student.id, schoolId);
      setCurrentToken(token);
      setShowQRCode(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to generate pickup code');
    } finally {
      setLoading(false);
    }
  };

  const handleTokenExpired = () => {
    Alert.alert(
      'Code Expired',
      'Your pickup code has expired. Generate a new one?',
      [
        { text: 'Cancel', onPress: handleCloseQRCode },
        { text: 'Generate New', onPress: handleGenerateCode },
      ]
    );
  };

  const handleCloseQRCode = async () => {
    await TokenService.invalidateToken();
    setShowQRCode(false);
    setCurrentToken(null);
  };

  // Debug: Log token when generated
  useEffect(() => {
    if (currentToken && __DEV__) {
      console.log('Current token QR data:', currentToken.qrCodeData);
      console.log('Is URL format?', currentToken.qrCodeData.startsWith('geofenceschool://'));
    }
  }, [currentToken]);

  if (showQRCode && currentToken) {
    return (
      <Modal visible={true} animationType="slide">
        <QRCodeDisplay
          token={currentToken}
          onExpired={handleTokenExpired}
          onClose={handleCloseQRCode}
        />
      </Modal>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.icon}>🎒</Text>
        <Text style={styles.title}>Pickup Code</Text>
        <Text style={styles.description}>
          Generate a secure QR code to show school staff during pickup
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <Text style={styles.infoText}>
            1. Tap "Generate Code" below{'\n'}
            2. Show the QR code to school staff{'\n'}
            3. They'll scan it to verify your identity{'\n'}
            4. Pick up your student safely{'\n'}
            5. Code expires after 15 minutes
          </Text>
        </View>

        {user?.students && user.students.length > 0 && (
          <View style={styles.studentInfo}>
            <Text style={styles.studentLabel}>Student:</Text>
            <Text style={styles.studentName}>{user.students[0].name}</Text>
            <Text style={styles.studentGrade}>Grade {user.students[0].grade}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleGenerateCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Generate Pickup Code</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.securityNote}>
          🔒 Your code is encrypted and can only be used once
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  infoBox: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  studentInfo: {
    backgroundColor: '#E6F4FE',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 32,
    alignItems: 'center',
  },
  studentLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  studentGrade: {
    fontSize: 16,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  securityNote: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

