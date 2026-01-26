import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Brightness from 'expo-brightness';
import { PickupToken } from '@/services/token.service';

interface QRCodeDisplayProps {
  token: PickupToken;
  onExpired?: () => void;
  onClose?: () => void;
}

export default function QRCodeDisplay({ token, onExpired, onClose }: QRCodeDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [originalBrightness, setOriginalBrightness] = useState<number>(0);

  useEffect(() => {
    // Increase screen brightness for better scanning
    const setupBrightness = async () => {
      try {
        const { status } = await Brightness.requestPermissionsAsync();
        if (status === 'granted') {
          const current = await Brightness.getBrightnessAsync();
          setOriginalBrightness(current);
          await Brightness.setBrightnessAsync(1.0);
        }
      } catch (error) {
        console.error('Brightness control error:', error);
      }
    };

    setupBrightness();

    // Restore brightness on unmount
    return () => {
      if (originalBrightness > 0) {
        Brightness.setBrightnessAsync(originalBrightness);
      }
    };
  }, []);

  useEffect(() => {
    // Update countdown timer
    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(token.expiresAt);
      const remaining = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / 1000));
      
      setTimeRemaining(remaining);

      if (remaining === 0 && onExpired) {
        onExpired();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [token, onExpired]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (): string => {
    if (timeRemaining > 300) return '#4CAF50'; // Green
    if (timeRemaining > 120) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const handleInvalidate = () => {
    Alert.alert(
      'Invalidate Code',
      'Are you sure you want to invalidate this pickup code? You will need to generate a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Invalidate',
          style: 'destructive',
          onPress: onClose,
        },
      ]
    );
  };

  const screenWidth = Dimensions.get('window').width;
  const qrSize = screenWidth * 0.7;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Pickup Code</Text>
        <TouchableOpacity onPress={handleInvalidate} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.qrContainer}>
        <View style={styles.qrWrapper}>
          <QRCode
            value={token.qrCodeData}
            size={qrSize}
            backgroundColor="white"
            color="black"
            logoSize={0}
          />
        </View>
        {/* Debug: Log what's in the QR code */}
        {__DEV__ && (
          <Text style={{ fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center' }}>
            QR contains: {token.qrCodeData.substring(0, 50)}...
          </Text>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Expires in</Text>
          <Text style={[styles.timerValue, { color: getTimeColor() }]}>
            {formatTime(timeRemaining)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsContainer}>
          <Text style={styles.detailLabel}>Token ID</Text>
          <Text style={styles.detailValue}>{token.id.slice(0, 12)}...</Text>
        </View>

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>📱 Instructions</Text>
          <Text style={styles.instructionsText}>
            1. Show this code to school staff{'\n'}
            2. Keep your screen brightness high{'\n'}
            3. Hold still while they scan{'\n'}
            4. Scanning will open the validator page automatically{'\n'}
            5. Code will expire after use or timeout
          </Text>
          {__DEV__ && (
            <View style={{ marginTop: 12, padding: 8, backgroundColor: '#f0f0f0', borderRadius: 4 }}>
              <Text style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
                QR contains URL: {token.qrCodeData.startsWith('geofenceschool://') ? '✓ Yes' : '✗ No'}
                {'\n'}
                Preview: {token.qrCodeData.substring(0, 60)}...
              </Text>
            </View>
          )}
        </View>
      </View>

      {timeRemaining < 60 && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>⚠️ Code expiring soon!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    fontSize: 20,
    color: '#666',
  },
  qrContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  qrWrapper: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  infoContainer: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: 'bold',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 20,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
  },
  warningContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE69C',
  },
  warningText: {
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center',
  },
});

