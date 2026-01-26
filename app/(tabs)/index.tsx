import LocationMap from '@/components/location-map';
import UserMenu from '@/components/user-menu';
import { SCHOOLS } from '@/config/aws-config';
import AuthService, { UserProfile } from '@/services/auth.service';
import GeofencingService from '@/services/geofencing.service';
import NotificationService from '@/services/notification.service';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function HomeScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [nearestSchool, setNearestSchool] = useState<any>(null);

  useEffect(() => {
    loadUserData();
    initializeServices();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Load user error:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeServices = async () => {
    try {
      // Initialize notifications (will request permissions)
      const notifInitialized = await NotificationService.initialize();
      if (!notifInitialized) {
        console.log('Notification permissions not granted');
      }
      
      // Check if geofencing is already active
      const monitoring = GeofencingService.isMonitoringActive();
      setIsMonitoring(monitoring);
    } catch (error) {
      console.log('Initialize services:', error);
    }
  };

  const handleStartMonitoring = async () => {
    try {
      const regions = SCHOOLS.map(school => ({
        id: school.id,
        name: school.name,
        latitude: school.geofence.latitude,
        longitude: school.geofence.longitude,
        radius: school.geofence.radius,
      }));

      const started = await GeofencingService.startMonitoring(regions);
      
      if (started) {
        setIsMonitoring(true);
        Alert.alert('Monitoring Started', 'We\'ll notify you when you approach the school.');
      } else {
        Alert.alert('Error', 'Could not start location monitoring. Please check permissions.');
      }
    } catch (error) {
      console.error('Start monitoring error:', error);
      Alert.alert('Error', 'Failed to start monitoring');
    }
  };

  const handleStopMonitoring = async () => {
    try {
      await GeofencingService.stopMonitoring();
      setIsMonitoring(false);
      Alert.alert('Monitoring Stopped', 'Location monitoring has been disabled.');
    } catch (error) {
      console.error('Stop monitoring error:', error);
    }
  };

  const checkCurrentLocation = async () => {
    try {
      // First check if we have permissions
      const hasPermissions = await GeofencingService.requestPermissions();
      
      if (!hasPermissions) {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to use this feature. Go to Settings > Apps > School Pickup > Permissions.',
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await GeofencingService.checkGeofenceEntry();
      
      if (result.isInside && result.school) {
        setNearestSchool(result.school);
        Alert.alert(
          '📍 Near School',
          `You're ${Math.round(result.distance || 0)}m from ${result.school.name}. Ready to show your pickup code?`,
          [
            { text: 'Not Yet', style: 'cancel' },
            { text: 'Show Code', onPress: () => router.push('/pickup') },
          ]
        );
      } else {
        Alert.alert('Location Check', 'You\'re not currently near any registered school.');
      }
    } catch (error) {
      console.error('Check location error:', error);
      Alert.alert('Error', 'Unable to check location. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.signOut();
              Alert.alert('Success', 'Logged out successfully');
              router.replace('/auth/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    router.push('/auth/profile-setup');
  };

  const handleSettings = () => {
    Alert.alert('Settings', 'Settings screen coming soon!');
  };

  const menuItems = [
    {
      label: 'Edit Profile',
      icon: '👤',
      onPress: handleEditProfile,
    },
    {
      label: 'Settings',
      icon: '⚙️',
      onPress: handleSettings,
    },
    {
      label: 'Logout',
      icon: '🚪',
      onPress: handleLogout,
      destructive: true,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name || 'Parent'}! 👋</Text>
            <Text style={styles.subtitle}>Welcome to School Pickup</Text>
          </View>
          <UserMenu
            userName={user?.name}
            userEmail={user?.email}
            menuItems={menuItems}
          />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <TouchableOpacity
          style={[styles.card, styles.primaryCard]}
          onPress={() => router.push('/pickup')}
        >
          <Text style={styles.cardIcon}>🎒</Text>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, styles.whiteText]}>Show Pickup Code</Text>
            <Text style={[styles.cardSubtitle, styles.whiteText]}>Generate your QR code for pickup</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={checkCurrentLocation}
        >
          <Text style={styles.cardIcon}>📍</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Check Location</Text>
            <Text style={styles.cardSubtitle}>See if you're near a school</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/validator')}
        >
          <Text style={styles.cardIcon}>📷</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Barcode Validator</Text>
            <Text style={styles.cardSubtitle}>Scan and validate pickup codes</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/pickup-board')}
        >
          <Text style={styles.cardIcon}>📋</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Pickup Board</Text>
            <Text style={styles.cardSubtitle}>View checked-in parents queue</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/stats')}
        >
          <Text style={styles.cardIcon}>📊</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Statistics</Text>
            <Text style={styles.cardSubtitle}>View pickup stats and KPIs</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Geofence Monitoring */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Monitoring</Text>
        
        <View style={styles.monitoringCard}>
          <View style={styles.monitoringHeader}>
            <Text style={styles.monitoringStatus}>
              {isMonitoring ? '✅ Active' : '⭕ Inactive'}
            </Text>
            <TouchableOpacity
              style={[
                styles.monitoringButton,
                isMonitoring ? styles.stopButton : styles.startButton,
              ]}
              onPress={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
            >
              <Text style={styles.monitoringButtonText}>
                {isMonitoring ? 'Stop' : 'Start'}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.monitoringDescription}>
            {isMonitoring
              ? 'We\'re monitoring your location and will notify you when you approach the school.'
              : 'Enable monitoring to automatically receive notifications when you reach the school.'}
          </Text>
          
          {/* Map with School Location and Geofence */}
          {SCHOOLS.length > 0 && (
            <View style={styles.mapContainer}>
              <LocationMap
                schoolLatitude={SCHOOLS[0].geofence.latitude}
                schoolLongitude={SCHOOLS[0].geofence.longitude}
                geofenceRadius={500}
                height={300}
              />
              <View style={styles.mapLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#007AFF' }]} />
                  <Text style={styles.legendText}>School Location</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: 'transparent', borderWidth: 3, borderColor: '#007AFF' }]} />
                  <Text style={styles.legendText}>500m Geofence</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.legendText}>Your Location</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Students */}
      {user?.students && user.students.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Students</Text>
          {user.students.map((student, index) => (
            <View key={index} style={styles.studentCard}>
              <Text style={styles.studentIcon}>👨‍🎓</Text>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentGrade}>Grade {student.grade}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Schools */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Registered Schools</Text>
        {SCHOOLS.map((school, index) => (
          <View key={index} style={styles.schoolCard}>
            <Text style={styles.schoolIcon}>🏫</Text>
            <View style={styles.schoolInfo}>
              <Text style={styles.schoolName}>{school.name}</Text>
              <Text style={styles.schoolAddress}>{school.address}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryCard: {
    backgroundColor: '#007AFF',
  },
  cardIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  whiteText: {
    color: '#fff',
  },
  monitoringCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monitoringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monitoringStatus: {
    fontSize: 16,
    fontWeight: '600',
  },
  monitoringButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  monitoringButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  monitoringDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  mapContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  studentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  studentIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  studentGrade: {
    fontSize: 14,
    color: '#666',
  },
  schoolCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  schoolIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  schoolAddress: {
    fontSize: 14,
    color: '#666',
  },
});
