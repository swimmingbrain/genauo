// src/screens/ReviewScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Dimensions,
  TextInput,
  StatusBar,
  Modal,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import StorageService from '../services/StorageService';
import MLService, { ManualCountingHelper } from '../services/MLService';
import { Detection } from '../types';
import { RootStackParamList } from '../../App';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Review'>;
type RouteType = RouteProp<RootStackParamList, 'Review'>;

const { width: screenWidth } = Dimensions.get('window');

export default function ReviewScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteType>();
  const { photoPath, sessionId } = route.params;

  const [detections, setDetections] = useState<Detection[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [manualCorrections, setManualCorrections] = useState(0);
  const [mode, setMode] = useState<'auto' | 'manual'>('manual');
  const [objectType, setObjectType] = useState('objects');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [autoCount, setAutoCount] = useState<number | null>(null);
  const [manualCountInput, setManualCountInput] = useState('');
  
  const handleManualCountChange = (text: string) => {
    setManualCountInput(text);
    const count = parseInt(text) || 0;
    
    // If user enters a number, clear existing detections and create placeholder detections
    if (count > 0 && count !== detections.length) {
      setDetections([]);
      setManualCorrections(0);
    }
  };

  useEffect(() => {
    setupImage();
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    const settings = await StorageService.getSettings();
    if (settings.openaiApiKey) {
      setApiKey(settings.openaiApiKey);
      MLService.setApiKey(settings.openaiApiKey);
    }
  };

  const saveApiKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter a valid API key');
      return;
    }
    
    MLService.setApiKey(apiKey);
    const settings = await StorageService.getSettings();
    await StorageService.saveSettings({ ...settings, openaiApiKey: apiKey });
    setShowApiKeyInput(false);
    
    if (mode === 'auto') {
      processImageWithAI();
    }
  };

  const setupImage = async () => {
    Image.getSize(photoPath, (width, height) => {
      const aspectRatio = width / height;
      const displayWidth = screenWidth;
      const displayHeight = displayWidth / aspectRatio;
      setImageSize({ width: displayWidth, height: displayHeight });
    });
    
    const session = await StorageService.getSession(sessionId);
    if (session && session.objectType) {
      setObjectType(session.objectType);
    }
  };

  const processImageWithAI = async () => {
    setIsProcessing(true);
    setDetections([]);
    
    try {
      if (!apiKey) {
        setShowApiKeyInput(true);
        setIsProcessing(false);
        return;
      }

      const detectedObjects = await MLService.detectObjects(photoPath, objectType);
      setDetections(detectedObjects);
      setAutoCount(detectedObjects.length);
      
      if (detectedObjects.length === 0) {
        Alert.alert(
          'No Objects Detected',
          'Try manual counting mode or adjust the lighting and retake the photo.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to process image:', error);
      Alert.alert(
        'Processing Error',
        'Failed to count objects. Please check your API key and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImagePress = (event: any) => {
    if (mode === 'manual' && !isProcessing) {
      const { locationX, locationY } = event.nativeEvent;
      
      const scaleX = imageSize.width / screenWidth;
      const scaleY = imageSize.height / imageSize.height;
      
      const newDetection = ManualCountingHelper.createManualDetection(
        locationX * scaleX,
        locationY * scaleY
      );
      setDetections([...detections, newDetection]);
      setManualCorrections(manualCorrections + 1);
      
      // Update manual count input to match the number of detections
      setManualCountInput((detections.length + 1).toString());
    }
  };

  const removeDetection = (id: string) => {
    const newDetections = detections.filter(d => d.id !== id);
    setDetections(newDetections);
    setManualCorrections(manualCorrections + 1);
    
    // Update manual count input to match the number of detections
    if (mode === 'manual') {
      setManualCountInput(newDetections.length.toString());
    }
  };

  const clearAll = () => {
    setDetections([]);
    setManualCorrections(0);
    setAutoCount(null);
    setManualCountInput('');
  };

  const switchToManual = () => {
    setMode('manual');
    clearAll();
  };

  const switchToAuto = () => {
    setMode('auto');
    clearAll();
    processImageWithAI();
  };

  const saveCount = async () => {
    try {
      const count = mode === 'manual' 
        ? parseInt(manualCountInput) || 0 
        : detections.length;
      
      if (mode === 'manual' && count === 0) {
        Alert.alert('Error', 'Please enter a count value');
        return;
      }

      await StorageService.addImageToSession(
        sessionId,
        photoPath,
        count,
        detections
      );

      Alert.alert(
        'Count Saved',
        `${count} ${objectType} counted`,
        [
          {
            text: 'Add Another Image',
            onPress: () => navigation.navigate('Camera', { sessionId }),
          },
          {
            text: 'View Session',
            onPress: () => navigation.navigate('Session', { sessionId }),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to save count:', error);
      Alert.alert('Error', 'Failed to save count');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Mode Selector */}
        <View style={styles.modeContainer}>
          <View style={styles.modeSelector}>
            <TouchableOpacity
              style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
              onPress={switchToManual}
              activeOpacity={0.8}
            >
              {mode === 'manual' && (
                <LinearGradient
                  colors={['#FF671F', '#FF8A4C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <View style={styles.modeButtonContent}>
                <Ionicons 
                  name="hand-left" 
                  size={20} 
                  color={mode === 'manual' ? '#fff' : '#666'} 
                />
                <Text style={[styles.modeButtonText, mode === 'manual' && styles.modeButtonTextActive]}>
                  Manual
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modeButton, mode === 'auto' && styles.modeButtonActive]}
              onPress={switchToAuto}
              activeOpacity={0.8}
            >
              {mode === 'auto' && (
                <LinearGradient
                  colors={['#FF671F', '#FF8A4C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <View style={styles.modeButtonContent}>
                <Ionicons 
                  name="sparkles" 
                  size={20} 
                  color={mode === 'auto' ? '#fff' : '#666'} 
                />
                <Text style={[styles.modeButtonText, mode === 'auto' && styles.modeButtonTextActive]}>
                  AI Count
                </Text>
              </View>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modeDescription}>
            {mode === 'auto' 
              ? 'AI automatically detects and counts objects'
              : 'Enter the number directly or tap objects to count'}
          </Text>
        </View>

        {/* Image Container */}
        <View style={styles.imageContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleImagePress}
            disabled={isProcessing || mode === 'auto'}
          >
            <Image
              source={{ uri: photoPath }}
              style={[styles.image, { height: imageSize.height }]}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Detection overlay for manual mode */}
          {mode === 'manual' && !isProcessing && imageSize.width > 0 && (
            <Svg
              style={[
                StyleSheet.absoluteFillObject,
                { height: imageSize.height },
              ]}
              viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
            >
              {detections.map((detection) => (
                <Circle
                  key={detection.id}
                  cx={detection.bbox.x + detection.bbox.width / 2}
                  cy={detection.bbox.y + detection.bbox.height / 2}
                  r={20}
                  stroke="#FF671F"
                  strokeWidth="3"
                  fill="rgba(255, 103, 31, 0.3)"
                />
              ))}
            </Svg>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <BlurView intensity={100} tint="dark" style={styles.processingOverlay}>
              <View style={styles.processingContent}>
                <ActivityIndicator size="large" color="#FF671F" />
                <Text style={styles.processingText}>
                  AI is analyzing your image...
                </Text>
                <Text style={styles.processingSubtext}>
                  Detecting {objectType}
                </Text>
              </View>
            </BlurView>
          )}
        </View>

        {/* Count Display */}
        <View style={styles.countCard}>
          <LinearGradient
            colors={['#FF671F', '#FF8A4C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.countGradient}
          >
            <View style={styles.countContent}>
              <Text style={styles.countLabel}>
                {mode === 'auto' ? 'AI Detection' : 'Manual Count'}
              </Text>
              {mode === 'manual' ? (
                <View style={styles.manualCountContainer}>
                  <TextInput
                    style={styles.manualCountInput}
                    placeholder="0"
                    placeholderTextColor="#666"
                    value={manualCountInput}
                    onChangeText={handleManualCountChange}
                    keyboardType="numeric"
                    textAlign="center"
                    maxLength={4}
                  />
                  <Text style={styles.countUnit}>{objectType}</Text>
                </View>
              ) : (
                <View style={styles.countRow}>
                  <Text style={styles.countNumber}>{detections.length}</Text>
                  <Text style={styles.countUnit}>{objectType}</Text>
                </View>
              )}
              {autoCount !== null && mode === 'manual' && (
                <Text style={styles.aiReference}>
                  AI detected: {autoCount}
                </Text>
              )}
              {manualCorrections > 0 && mode === 'auto' && (
                <View style={styles.correctionsBadge}>
                  <Ionicons name="create-outline" size={14} color="#FFD700" />
                  <Text style={styles.correctionsText}>
                    {manualCorrections} corrections
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={clearAll}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={20} color="#FF671F" />
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </TouchableOpacity>

          {mode === 'auto' && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={processImageWithAI}
              disabled={isProcessing}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color="#FF671F" />
              <Text style={styles.secondaryButtonText}>Recount</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.saveButton, (isProcessing || (mode === 'auto' ? detections.length === 0 : !manualCountInput.trim())) && styles.saveButtonDisabled]}
          onPress={saveCount}
          disabled={isProcessing || (mode === 'auto' ? detections.length === 0 : !manualCountInput.trim())}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={isProcessing || (mode === 'auto' ? detections.length === 0 : !manualCountInput.trim()) ? ['#333', '#222'] : ['#FF671F', '#FF8A4C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.saveButtonText}>Save Count</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* API Key Modal */}
      <Modal
        visible={showApiKeyInput}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFillObject} />
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#1A1A1A', '#0A0A0A']}
              style={styles.modalGradient}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="key" size={32} color="#FF671F" />
                </View>
                <Text style={styles.modalTitle}>OpenAI API Key Required</Text>
                <Text style={styles.modalDescription}>
                  Enter your API key to enable AI-powered counting
                </Text>
              </View>
              
                             <TextInput
                 style={styles.apiKeyInput}
                 placeholder="sk-..."
                 placeholderTextColor="#444"
                 value={apiKey}
                 onChangeText={setApiKey}
                 secureTextEntry={true}
                 autoCapitalize="none"
                 keyboardAppearance="dark"
               />
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowApiKeyInput(false);
                    switchToManual();
                  }}
                >
                  <Text style={styles.modalCancelText}>Use Manual</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={saveApiKey}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#FF671F', '#FF8A4C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalSaveGradient}
                  >
                    <Text style={styles.modalSaveText}>Save Key</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#0A0A0A',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  placeholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  modeContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 4,
    marginBottom: 12,
  },
  modeButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modeButtonActive: {
    shadowColor: '#FF671F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  modeDescription: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  image: {
    width: screenWidth - 40,
    borderRadius: 20,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingContent: {
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
  },
  processingSubtext: {
    color: '#FF671F',
    marginTop: 8,
    fontSize: 14,
  },
  countCard: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF671F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  countGradient: {
    padding: 1,
  },
  countContent: {
    backgroundColor: '#141414',
    borderRadius: 19,
    padding: 24,
    alignItems: 'center',
  },
  countLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  countNumber: {
    color: '#FF671F',
    fontSize: 56,
    fontWeight: '800',
  },
  manualCountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  manualCountInput: {
    color: '#FF671F',
    fontSize: 56,
    fontWeight: '800',
    backgroundColor: 'transparent',
    borderWidth: 0,
    minWidth: 80,
  },
  countUnit: {
    color: '#666',
    fontSize: 18,
    fontWeight: '600',
  },
  aiReference: {
    color: '#444',
    fontSize: 12,
    marginTop: 8,
  },
  correctionsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 4,
  },
  correctionsText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  secondaryButtonText: {
    color: '#FF671F',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomContainer: {
    padding: 20,
    paddingBottom: 34,
    backgroundColor: '#0A0A0A',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 103, 31, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    color: '#666',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  apiKeyInput: {
    backgroundColor: '#0A0A0A',
    color: '#fff',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSaveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});