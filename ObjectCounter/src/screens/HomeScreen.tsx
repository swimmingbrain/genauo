import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StorageService from '../services/StorageService';
import { Session } from '../types';
import { RootStackParamList } from '../../App';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = async () => {
    const data = await StorageService.getAllSessions();
    setSessions(data);
  };

  useFocusEffect(
    useCallback(() => {
      loadSessions();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  const deleteSession = (sessionId: string, sessionName: string) => {
    Alert.alert(
      'Delete Session',
      `Are you sure you want to delete "${sessionName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await StorageService.deleteSession(sessionId);
            loadSessions();
          },
        },
      ]
    );
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (d.toDateString() === today.toDateString()) {
      return `Today • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + 
           ' • ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderSession = ({ item, index }: { item: Session; index: number }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => navigation.navigate('Session', { sessionId: item.id })}
      onLongPress={() => deleteSession(item.id, item.name)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={['#FF671F', '#FF8A4C']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sessionGradient}
      >
        <View style={styles.sessionContent}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionTitleContainer}>
              <Text style={styles.sessionName} numberOfLines={1}>
                {item.name}
              </Text>
              {item.objectType && (
                <View style={styles.objectTypeBadge}>
                  <Text style={styles.objectTypeText}>{item.objectType}</Text>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </View>
          
          <View style={styles.sessionStats}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="cube" size={16} color="#FF671F" />
              </View>
              <Text style={styles.statNumber}>{item.totalCount}</Text>
              <Text style={styles.statLabel}>items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="images" size={16} color="#FF671F" />
              </View>
              <Text style={styles.statNumber}>{item.images.length}</Text>
              <Text style={styles.statLabel}>images</Text>
            </View>
          </View>
          
          <View style={styles.sessionFooter}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
            <Text style={styles.sessionDate}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* New Session Button */}
      <TouchableOpacity
        style={styles.newButton}
        onPress={() => navigation.navigate('NewSession')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#FF671F', '#FF8A4C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.newButtonGradient}
        >
          <View style={styles.newButtonContent}>
            <View style={styles.newButtonIcon}>
              <Ionicons name="add" size={24} color="#fff" />
            </View>
            <Text style={styles.newButtonText}>Start New Counting Session</Text>
            <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.8)" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="camera-outline" size={80} color="#FF671F" />
          </View>
          <Text style={styles.emptyText}>No counting sessions yet</Text>
          <Text style={styles.emptySubtext}>
            Create your first session to start counting objects with AI
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <Text style={styles.sectionCount}>{sessions.length} total</Text>
          </View>
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={renderSession}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#FF671F"
              />
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  newButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#FF671F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  newButtonGradient: {
    borderRadius: 16,
    padding: 16,
  },
  newButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginLeft: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  sectionCount: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: 30,
  },
  sessionCard: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  sessionGradient: {
    borderRadius: 20,
    padding: 1,
  },
  sessionContent: {
    backgroundColor: '#141414',
    borderRadius: 19,
    padding: 20,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  sessionName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  objectTypeBadge: {
    backgroundColor: 'rgba(255, 103, 31, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  objectTypeText: {
    color: '#FF671F',
    fontSize: 12,
    fontWeight: '600',
  },
  sessionStats: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 103, 31, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginRight: 4,
  },
  statLabel: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 16,
  },
  sessionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionDate: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 103, 31, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});