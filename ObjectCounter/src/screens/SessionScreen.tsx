// src/screens/SessionScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Share,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import StorageService from '../services/StorageService';
import { Session, ImageCount } from '../types';
import { RootStackParamList } from '../../App';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Session'>;
type RouteType = RouteProp<RootStackParamList, 'Session'>;

const { width } = Dimensions.get('window');

export default function SessionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { sessionId } = route.params;

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    setLoading(true);
    const data = await StorageService.getSession(sessionId);
    setSession(data);
    setLoading(false);
  };

  const exportCSV = async () => {
    if (!session) return;

    try {
      const csv = await StorageService.exportSessionAsCSV(sessionId);
      const fileUri = `${FileSystem.documentDirectory}${session.name}_count.csv`;
      
      await FileSystem.writeAsStringAsync(fileUri, csv);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', 'CSV file saved to device');
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Error', 'Failed to export CSV');
    }
  };

  const deleteImage = (imageId: string) => {
    Alert.alert(
      'Delete Image',
      'Are you sure you want to remove this image from the session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            
            const updatedImages = session.images.filter(img => img.id !== imageId);
            const updatedSession = {
              ...session,
              images: updatedImages,
              totalCount: updatedImages.reduce((sum, img) => sum + img.count, 0),
            };
            
            await StorageService.updateSession(updatedSession);
            setSession(updatedSession);
          },
        },
      ]
    );
  };

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderImage = ({ item, index }: { item: ImageCount; index: number }) => (
    <TouchableOpacity
      style={styles.imageCard}
      onLongPress={() => deleteImage(item.id)}
      activeOpacity={0.9}
    >
      <View style={styles.imageCardContent}>
        <Image source={{ uri: item.path }} style={styles.thumbnail} />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.imageGradient}
        >
          <View style={styles.imageInfo}>
            <View style={styles.imageHeader}>
              <Text style={styles.imageIndex}>#{index + 1}</Text>
              <Text style={styles.imageTime}>{formatTime(item.timestamp)}</Text>
            </View>
            <View style={styles.imageStats}>
              <Text style={styles.imageCount}>{item.count}</Text>
              <Text style={styles.imageCountLabel}>objects</Text>
            </View>
            {item.corrections > 0 && (
              <View style={styles.correctionsBadge}>
                <Ionicons name="create" size={12} color="#FFD700" />
                <Text style={styles.correctionsText}>{item.corrections}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF671F" />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Session not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={exportCSV}
          >
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.headerContent}>
          <Text style={styles.sessionName}>{session.name}</Text>
          {session.objectType && (
            <View style={styles.objectTypeBadge}>
              <Ionicons name="pricetag" size={14} color="#FF671F" />
              <Text style={styles.objectTypeText}>{session.objectType}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cube" size={24} color="#FF671F" />
            </View>
            <Text style={styles.statValue}>{session.totalCount}</Text>
            <Text style={styles.statLabel}>Total Count</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="images" size={24} color="#FF671F" />
            </View>
            <Text style={styles.statValue}>{session.images.length}</Text>
            <Text style={styles.statLabel}>Images</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="analytics" size={24} color="#FF671F" />
            </View>
            <Text style={styles.statValue}>
              {session.images.length > 0
                ? Math.round(session.totalCount / session.images.length)
                : 0}
            </Text>
            <Text style={styles.statLabel}>Avg/Image</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Camera', { sessionId })}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF671F', '#FF8A4C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.actionGradient}
          >
            <Ionicons name="camera" size={22} color="#fff" />
            <Text style={styles.actionButtonText}>Add Photo</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryActionButton}
          onPress={exportCSV}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={22} color="#FF671F" />
          <Text style={styles.secondaryActionText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Images Grid */}
      {session.images.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="camera-outline" size={60} color="#FF671F" />
          </View>
          <Text style={styles.emptyText}>No images yet</Text>
          <Text style={styles.emptySubtext}>
            Take your first photo to start counting
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Camera', { sessionId })}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF671F', '#FF8A4C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.emptyButtonGradient}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Take First Photo</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={session.images}
          keyExtractor={(item) => item.id}
          renderItem={renderImage}
          numColumns={2}
          contentContainerStyle={styles.imagesList}
          columnWrapperStyle={styles.imageRow}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A0A',
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  sessionName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  objectTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  objectTypeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF671F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  secondaryActionText: {
    color: '#FF671F',
    fontSize: 16,
    fontWeight: '600',
  },
  imagesList: {
    padding: 10,
    paddingBottom: 30,
  },
  imageRow: {
    justifyContent: 'space-between',
  },
  imageCard: {
    width: (width - 40) / 2,
    height: (width - 40) / 2,
    margin: 10,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  imageCardContent: {
    flex: 1,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
  },
  imageInfo: {
    padding: 12,
  },
  imageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  imageIndex: {
    color: '#FF671F',
    fontSize: 12,
    fontWeight: '700',
  },
  imageTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  imageStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  imageCount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  imageCountLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  correctionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  correctionsText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 103, 31, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});