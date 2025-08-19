import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import StorageService from '../services/StorageService';
import { RootStackParamList } from '../../App';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Camera'>;
type RouteType = RouteProp<RootStackParamList, 'Camera'>;

const { width, height } = Dimensions.get('window');

export default function CameraScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { sessionId } = route.params;
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [showGuide, setShowGuide] = useState(true);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    
    // Hide guide after 3 seconds
    setTimeout(() => setShowGuide(false), 3000);
  }, []);

  const takePicture = async () => {
    if (!cameraRef.current || isProcessing) return;

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        exif: true,
      });

      if (!photo) {
        throw new Error('Failed to capture photo');
      }

      // Save image to permanent storage
      const savedPath = await StorageService.saveImage(photo.uri);
      
      // Navigate to review screen
      navigation.navigate('Review', { 
        photoPath: savedPath, 
        sessionId: sessionId 
      });
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Error', 'Failed to capture photo');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF671F" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <View style={styles.permissionIconContainer}>
            <Ionicons name="camera-outline" size={60} color="#FF671F" />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to count objects in your photos
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => Camera.requestCameraPermissionsAsync()}
          >
            <LinearGradient
              colors={['#FF671F', '#FF8A4C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.permissionButtonGradient}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        flash={flash}
      >
        <View style={styles.overlay}>
          {/* Scanning frame with corners */}
          <View style={styles.scanArea}>
            <View style={styles.scanCorner} />
            <View style={[styles.scanCorner, styles.scanCornerTR]} />
            <View style={[styles.scanCorner, styles.scanCornerBL]} />
            <View style={[styles.scanCorner, styles.scanCornerBR]} />
            
            {/* Grid overlay */}
            <View style={styles.gridContainer}>
              {[...Array(9)].map((_, i) => (
                <View key={i} style={styles.gridCell} />
              ))}
            </View>
          </View>

          {/* Top controls with blur background */}
          <BlurView intensity={80} tint="dark" style={styles.topControls}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.topRightControls}>
              <TouchableOpacity
                style={[styles.controlButton, flash === 'on' && styles.controlButtonActive]}
                onPress={toggleFlash}
              >
                <Ionicons
                  name={flash === 'on' ? 'flash' : 'flash-off'}
                  size={22}
                  color={flash === 'on' ? '#FF671F' : '#fff'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleCameraFacing}
              >
                <Ionicons name="camera-reverse" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </BlurView>

          {/* Guide text */}
          {showGuide && (
            <View style={styles.guideContainer}>
              <BlurView intensity={90} tint="dark" style={styles.guideBlur}>
                <Ionicons name="scan" size={20} color="#FF671F" />
                <Text style={styles.guideText}>
                  Position all objects within the frame
                </Text>
              </BlurView>
            </View>
          )}

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={() => navigation.navigate('Session', { sessionId })}
            >
              <BlurView intensity={80} tint="dark" style={styles.galleryButtonBlur}>
                <Ionicons name="images" size={28} color="#fff" />
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureContainer, isProcessing && styles.captureDisabled]}
              onPress={takePicture}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isProcessing ? ['#666', '#444'] : ['#FF671F', '#FF8A4C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.captureGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={styles.captureInner} />
                )}
              </LinearGradient>
              <View style={styles.captureRing} />
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>

          {/* Session info */}
          <View style={styles.sessionInfo}>
            <BlurView intensity={80} tint="dark" style={styles.sessionInfoBlur}>
              <Ionicons name="folder-open" size={16} color="#FF671F" />
              <Text style={styles.sessionInfoText}>Current Session</Text>
            </BlurView>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scanArea: {
    position: 'absolute',
    top: height * 0.2,
    left: width * 0.1,
    right: width * 0.1,
    height: height * 0.45,
    borderRadius: 20,
  },
  scanCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FF671F',
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 15,
  },
  scanCornerTR: {
    right: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 15,
  },
  scanCornerBL: {
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 15,
  },
  scanCornerBR: {
    right: 0,
    bottom: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: 15,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 40,
  },
  gridCell: {
    width: '33.33%',
    height: '33.33%',
    borderWidth: 0.3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 103, 31, 0.2)',
  },
  guideContainer: {
    position: 'absolute',
    top: 130,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  guideBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    overflow: 'hidden',
    gap: 8,
  },
  guideText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  galleryButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureContainer: {
    position: 'relative',
  },
  captureGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  captureRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255, 103, 31, 0.3)',
    top: -4,
    left: -4,
  },
  captureDisabled: {
    opacity: 0.5,
  },
  placeholder: {
    width: 56,
  },
  sessionInfo: {
    position: 'absolute',
    bottom: 120,
    left: 20,
  },
  sessionInfoBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    gap: 6,
  },
  sessionInfoText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 103, 31, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  permissionText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  permissionButtonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});