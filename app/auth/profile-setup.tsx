import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import AuthService from '@/services/auth.service';
import { StudentInfo, VehicleInfo } from '@/services/auth.service';

export default function ProfileSetupScreen() {
  const [studentName, setStudentName] = useState('');
  const [studentGrade, setStudentGrade] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!studentName || !studentGrade) {
      Alert.alert('Error', 'Please enter student name and grade');
      return;
    }

    setLoading(true);
    try {
      // Add student
      const student: StudentInfo = {
        id: `student-${Date.now()}`,
        name: studentName,
        grade: studentGrade,
        schoolId: 'school-1', // Default to first school
      };

      await AuthService.addStudent(student);

      // Add vehicle info if provided
      if (vehicleMake && vehicleModel) {
        const vehicle: VehicleInfo = {
          make: vehicleMake,
          model: vehicleModel,
          color: vehicleColor,
          licensePlate: licensePlate,
        };

        await AuthService.updateProfile({ vehicle });
      }

      Alert.alert('Success', 'Profile setup complete!', [
        { text: 'Get Started', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>
        Add your student and vehicle information to get started
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👨‍🎓 Student Information</Text>
        
        <TextInput
          style={styles.input}
          placeholder="Student Name *"
          value={studentName}
          onChangeText={setStudentName}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Grade (e.g., 3rd, 4th) *"
          value={studentGrade}
          onChangeText={setStudentGrade}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🚗 Vehicle Information (Optional)</Text>
        <Text style={styles.sectionSubtitle}>
          Help staff identify your vehicle during pickup
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Make (e.g., Toyota)"
          value={vehicleMake}
          onChangeText={setVehicleMake}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Model (e.g., Camry)"
          value={vehicleModel}
          onChangeText={setVehicleModel}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="Color (e.g., Blue)"
          value={vehicleColor}
          onChangeText={setVehicleColor}
          autoCapitalize="words"
        />

        <TextInput
          style={styles.input}
          placeholder="License Plate"
          value={licensePlate}
          onChangeText={setLicensePlate}
          autoCapitalize="characters"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={handleComplete}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Complete Setup</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => router.replace('/(tabs)')}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    padding: 16,
  },
  skipText: {
    color: '#007AFF',
    fontSize: 16,
  },
});

