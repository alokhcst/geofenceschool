import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import StatsService, { PickupStats, DailyStats } from '@/services/stats.service';
import { SCHOOLS } from '@/config/aws-config';

export default function StatsScreen() {
  const [stats, setStats] = useState<PickupStats | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [topMetrics, setTopMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  const loadStats = async () => {
    try {
      setLoading(true);

      // Calculate date range
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (dateRange === 'today') {
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
      } else if (dateRange === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date();
      } else if (dateRange === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        endDate = new Date();
      }

      const dateRangeObj = startDate && endDate ? { start: startDate, end: endDate } : undefined;

      // Load stats
      const statsData = await StatsService.getPickupStats(selectedSchool || undefined, dateRangeObj);
      setStats(statsData);

      // Load daily stats for last 7 days
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const dailyData = await StatsService.getDailyStats(weekStart, new Date(), selectedSchool || undefined);
      setDailyStats(dailyData);

      // Load top metrics
      const topData = await StatsService.getTopMetrics(selectedSchool || undefined);
      setTopMetrics(topData);
    } catch (error) {
      console.error('Load stats error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [selectedSchool, dateRange]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getSchoolName = (schoolId: string): string => {
    const school = SCHOOLS.find((s) => s.id === schoolId);
    return school ? school.name : schoolId;
  };

  if (loading && !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pickup Statistics</Text>
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
        <Text style={styles.headerTitle}>Pickup Statistics</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date Range Filter */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['today', 'week', 'month', 'all'] as const).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.filterButton,
                  dateRange === range && styles.filterButtonActive,
                ]}
                onPress={() => setDateRange(range)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    dateRange === range && styles.filterButtonTextActive,
                  ]}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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

        {stats && (
          <>
            {/* Key Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
              
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>📊</Text>
                  <Text style={styles.metricValue}>{stats.totalPickups}</Text>
                  <Text style={styles.metricLabel}>Total Pickups</Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>📅</Text>
                  <Text style={styles.metricValue}>{stats.totalPickupsToday}</Text>
                  <Text style={styles.metricLabel}>Today</Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>✅</Text>
                  <Text style={styles.metricValue}>{stats.onTimePickups}</Text>
                  <Text style={styles.metricLabel}>On-Time Pickups</Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>⏱️</Text>
                  <Text style={styles.metricValue}>{stats.averageWaitTime}</Text>
                  <Text style={styles.metricLabel}>Avg Wait (min)</Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>⚡</Text>
                  <Text style={styles.metricValue}>{stats.fastestPickup}</Text>
                  <Text style={styles.metricLabel}>Fastest (min)</Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricIcon}>📈</Text>
                  <Text style={styles.metricValue}>{stats.completionRate}%</Text>
                  <Text style={styles.metricLabel}>Completion Rate</Text>
                </View>
              </View>
            </View>

            {/* Performance Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
              
              <View style={styles.performanceCard}>
                <View style={styles.performanceRow}>
                  <Text style={styles.performanceLabel}>On-Time Rate:</Text>
                  <Text style={styles.performanceValue}>
                    {stats.totalPickups > 0
                      ? Math.round((stats.onTimePickups / stats.totalPickups) * 100)
                      : 0}%
                  </Text>
                </View>
                <View style={styles.performanceRow}>
                  <Text style={styles.performanceLabel}>Average Wait Time:</Text>
                  <Text style={styles.performanceValue}>{stats.averageWaitTime} minutes</Text>
                </View>
                <View style={styles.performanceRow}>
                  <Text style={styles.performanceLabel}>Fastest Pickup:</Text>
                  <Text style={styles.performanceValue}>{stats.fastestPickup} minutes</Text>
                </View>
                <View style={styles.performanceRow}>
                  <Text style={styles.performanceLabel}>Slowest Pickup:</Text>
                  <Text style={styles.performanceValue}>{stats.slowestPickup} minutes</Text>
                </View>
              </View>
            </View>

            {/* Top Metrics */}
            {topMetrics && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Performance</Text>
                
                <View style={styles.topMetricsCard}>
                  <View style={styles.topMetricItem}>
                    <Text style={styles.topMetricIcon}>🏆</Text>
                    <View style={styles.topMetricContent}>
                      <Text style={styles.topMetricLabel}>Best Day</Text>
                      <Text style={styles.topMetricValue}>
                        {formatDate(topMetrics.bestDay.date)} ({topMetrics.bestDay.pickups} pickups)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.topMetricItem}>
                    <Text style={styles.topMetricIcon}>⏰</Text>
                    <View style={styles.topMetricContent}>
                      <Text style={styles.topMetricLabel}>Peak Hour</Text>
                      <Text style={styles.topMetricValue}>
                        {topMetrics.peakHour.hour} ({topMetrics.peakHour.pickups} pickups)
                      </Text>
                    </View>
                  </View>

                  <View style={styles.topMetricItem}>
                    <Text style={styles.topMetricIcon}>🏫</Text>
                    <View style={styles.topMetricContent}>
                      <Text style={styles.topMetricLabel}>Top School</Text>
                      <Text style={styles.topMetricValue}>
                        {getSchoolName(topMetrics.bestSchool.schoolId)} ({topMetrics.bestSchool.pickups} pickups)
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Daily Stats */}
            {dailyStats.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Last 7 Days</Text>
                
                {dailyStats.map((day) => (
                  <View key={day.date} style={styles.dailyStatCard}>
                    <View style={styles.dailyStatHeader}>
                      <Text style={styles.dailyStatDate}>{formatDate(day.date)}</Text>
                      <Text style={styles.dailyStatPickups}>{day.completedPickups} pickups</Text>
                    </View>
                    <View style={styles.dailyStatDetails}>
                      <View style={styles.dailyStatDetail}>
                        <Text style={styles.dailyStatLabel}>Check-ins:</Text>
                        <Text style={styles.dailyStatValue}>{day.totalCheckIns}</Text>
                      </View>
                      <View style={styles.dailyStatDetail}>
                        <Text style={styles.dailyStatLabel}>Avg Wait:</Text>
                        <Text style={styles.dailyStatValue}>{day.averageWaitTime} min</Text>
                      </View>
                      <View style={styles.dailyStatDetail}>
                        <Text style={styles.dailyStatLabel}>On-Time:</Text>
                        <Text style={styles.dailyStatValue}>{day.onTimeRate}%</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Pickups by School */}
            {Object.keys(stats.pickupsBySchool).length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pickups by School</Text>
                
                {Object.entries(stats.pickupsBySchool).map(([schoolId, count]) => (
                  <View key={schoolId} style={styles.schoolStatCard}>
                    <Text style={styles.schoolStatName}>{getSchoolName(schoolId)}</Text>
                    <Text style={styles.schoolStatCount}>{count} pickups</Text>
                  </View>
                ))}
              </View>
            )}
          </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
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
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '47%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  performanceCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  performanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  topMetricsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topMetricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topMetricIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  topMetricContent: {
    flex: 1,
  },
  topMetricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  topMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dailyStatCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dailyStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dailyStatDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dailyStatPickups: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  dailyStatDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dailyStatDetail: {
    alignItems: 'center',
  },
  dailyStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dailyStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  schoolStatCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  schoolStatName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  schoolStatCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
