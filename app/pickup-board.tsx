import { SCHOOLS } from '@/config/aws-config';
import CheckInService, { CheckIn } from '@/services/checkin.service';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PickupBoardScreen() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);

  const loadCheckIns = async () => {
    try {
      const data = await CheckInService.getCheckIns(selectedSchool || undefined);
      setCheckIns(data);
    } catch (error) {
      console.error('Load check-ins error:', error);
      Alert.alert('Error', 'Failed to load pickup board');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCheckIns();
  }, [selectedSchool]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCheckIns();
    }, [selectedSchool])
  );

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadCheckIns();
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedSchool]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCheckIns();
  };

  const handleStatusChange = async (checkInId: string, newStatus: 'waiting' | 'processing' | 'completed') => {
    try {
      await CheckInService.updateCheckInStatus(checkInId, newStatus);
      await loadCheckIns();
    } catch (error) {
      console.error('Update status error:', error);
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleRemove = (checkInId: string) => {
    Alert.alert(
      'Remove Check-in',
      'Are you sure you want to remove this check-in?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await CheckInService.removeCheckIn(checkInId);
              await loadCheckIns();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove check-in');
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to clear all check-ins?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await CheckInService.clearAllCheckIns();
              await loadCheckIns();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear check-ins');
            }
          },
        },
      ]
    );
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'waiting':
        return '#FF9800';
      case 'processing':
        return '#2196F3';
      case 'completed':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'waiting':
        return 'Waiting';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  const waitingCount = checkIns.filter((ci) => ci.status === 'waiting').length;
  const processingCount = checkIns.filter((ci) => ci.status === 'processing').length;
  const totalCount = checkIns.length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pickup Board</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
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
        <Text style={styles.headerTitle}>Pickup Board</Text>
        <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.waitingCard]}>
          <Text style={[styles.statNumber, styles.waitingText]}>{waitingCount}</Text>
          <Text style={styles.statLabel}>Waiting</Text>
        </View>
        <View style={[styles.statCard, styles.processingCard]}>
          <Text style={[styles.statNumber, styles.processingText]}>{processingCount}</Text>
          <Text style={styles.statLabel}>Processing</Text>
        </View>
      </View>

      {/* School Filter */}
      {SCHOOLS.length > 1 && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedSchool === null && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedSchool(null)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedSchool === null && styles.filterButtonTextActive,
                ]}
              >
                All Schools
              </Text>
            </TouchableOpacity>
            {SCHOOLS.map((school) => (
              <TouchableOpacity
                key={school.id}
                style={[
                  styles.filterButton,
                  selectedSchool === school.id && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedSchool(school.id)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedSchool === school.id && styles.filterButtonTextActive,
                  ]}
                >
                  {school.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Check-ins List */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {checkIns.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No check-ins yet</Text>
            <Text style={styles.emptySubtext}>
              Check-ins will appear here when parents scan their QR codes
            </Text>
          </View>
        ) : (
          checkIns.map((checkIn, index) => (
            <View key={checkIn.id} style={styles.checkInCard}>
              {/* Sequence Number */}
              <View style={styles.sequenceBadge}>
                <Text style={styles.sequenceNumber}>{index + 1}</Text>
              </View>

              {/* Main Content */}
              <View style={styles.checkInContent}>
                <View style={styles.checkInHeader}>
                  <View style={styles.nameSection}>
                    <Text style={styles.parentName}>{checkIn.parentName}</Text>
                    <Text style={styles.studentName}>
                      👨‍🎓 {checkIn.studentName} - {checkIn.studentGrade}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(checkIn.status) },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {getStatusLabel(checkIn.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.checkInDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>⏰ Arrived:</Text>
                    <Text style={styles.detailValue}>
                      {formatTime(checkIn.checkedInAt)} ({getTimeAgo(checkIn.checkedInAt)})
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>🏫 School:</Text>
                    <Text style={styles.detailValue}>
                      {SCHOOLS.find((s) => s.id === checkIn.schoolId)?.name || checkIn.schoolId}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {checkIn.status === 'waiting' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.processButton]}
                      onPress={() => handleStatusChange(checkIn.id, 'processing')}
                    >
                      <Text style={styles.actionButtonText}>Start Processing</Text>
                    </TouchableOpacity>
                  )}
                  {checkIn.status === 'processing' && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleStatusChange(checkIn.id, 'completed')}
                    >
                      <Text style={styles.actionButtonText}>Mark Complete</Text>
                    </TouchableOpacity>
                  )}
                  {(checkIn.status === 'waiting' || checkIn.status === 'processing') && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.removeButton]}
                      onPress={() => handleRemove(checkIn.id)}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    minWidth: 60,
  },
  backText: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    padding: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  clearButtonText: {
    fontSize: 16,
    color: '#F44336',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  waitingCard: {
    backgroundColor: '#FFF3E0',
  },
  processingCard: {
    backgroundColor: '#E3F2FD',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  waitingText: {
    color: '#FF9800',
  },
  processingText: {
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  checkInCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sequenceBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sequenceNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  checkInContent: {
    flex: 1,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  nameSection: {
    flex: 1,
  },
  parentName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  checkInDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  processButton: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  removeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F44336',
  },
});
