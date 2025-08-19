import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import StorageService from '../services/StorageService';
import { RootStackParamList } from '../../App';

type NavigationProp = StackNavigationProp<RootStackParamList, 'NewSession'>;

export default function NewSessionScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [sessionName, setSessionName] = useState('');
  const [objectType, setObjectType] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const presets = [
    { id: '1', icon: 'hardware-chip', label: 'Electronics', value: 'Electronic Components' },
    { id: '2', icon: 'construct', label: 'Hardware', value: 'Screws & Bolts' },
    { id: '3', icon: 'cube', label: 'Inventory', value: 'Inventory Items' },
    { id: '4', icon: 'nutrition', label: 'Food', value: 'Food Items' },
    { id: '5', icon: 'shirt', label: 'Textiles', value: 'Textile Products' },
    { id: '6', icon: 'ellipsis-horizontal', label: 'Custom', value: '' },
  ];

  const selectPreset = (preset: typeof presets[0]) => {
    setSelectedPreset(preset.id);
    if (preset.value) {
      setObjectType(preset.value);
    } else {
      setObjectType('');
    }
  };

  const createSession = async () => {
    if (!sessionName.trim()) {
      alert('Please enter a session name');
      return;
    }

    const session = await StorageService.createSession(
      sessionName.trim(),
      objectType.trim() || undefined
    );

    navigation.replace('Camera', { sessionId: session.id });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>New Counting Session</Text>
          <Text style={styles.subtitle}>
            Set up your session to start counting objects
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Session Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Session Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="folder-outline" size={20} color="#FF671F" style={styles.inputIcon} />
                                                           <TextInput
                  style={styles.input}
                  placeholder="e.g., Warehouse Inventory"
                  placeholderTextColor="#444"
                  value={sessionName}
                  onChangeText={setSessionName}
                  keyboardAppearance="dark"
                />
            </View>
          </View>

          {/* Object Type Presets */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>What are you counting?</Text>
            <View style={styles.presetGrid}>
              {presets.map((preset) => (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.presetCard,
                    selectedPreset === preset.id && styles.presetCardActive
                  ]}
                  onPress={() => selectPreset(preset)}
                  activeOpacity={0.8}
                >
                  {selectedPreset === preset.id && (
                    <LinearGradient
                      colors={['#FF671F', '#FF8A4C']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                  <View style={styles.presetContent}>
                    <Ionicons 
                      name={preset.icon as any} 
                      size={24} 
                      color={selectedPreset === preset.id ? '#fff' : '#666'} 
                    />
                    <Text style={[
                      styles.presetLabel,
                      selectedPreset === preset.id && styles.presetLabelActive
                    ]}>
                      {preset.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Object Type Input */}
          {selectedPreset === '6' && (
            <View style={styles.inputGroup}>
              <View style={styles.inputContainer}>
                <Ionicons name="pricetag-outline" size={20} color="#FF671F" style={styles.inputIcon} />
                                 <TextInput
                   style={styles.input}
                   placeholder="Enter custom object type"
                   placeholderTextColor="#444"
                   value={objectType}
                   onChangeText={setObjectType}
                   keyboardAppearance="dark"
                 />
              </View>
            </View>
          )}

          {/* Object Type Display */}
          {objectType && selectedPreset !== '6' && (
            <View style={styles.selectedTypeContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.selectedTypeText}>Counting: {objectType}</Text>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <LinearGradient
              colors={['rgba(255, 103, 31, 0.1)', 'rgba(255, 138, 76, 0.05)']}
              style={styles.infoGradient}
            >
              <Ionicons name="information-circle" size={20} color="#FF671F" />
              <Text style={styles.infoText}>
                You can add multiple images to a single session. Each image will be counted separately and added to the total.
              </Text>
            </LinearGradient>
          </View>
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={createSession}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#FF671F', '#FF8A4C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.startButtonGradient}
          >
            <Text style={styles.startButtonText}>Start Counting</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginBottom: 20,
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
  titleSection: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#666',
    fontSize: 16,
    lineHeight: 22,
  },
  form: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  inputIcon: {
    marginLeft: 16,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    padding: 18,
    paddingLeft: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  presetCardActive: {
    borderColor: '#FF671F',
    shadowColor: '#FF671F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  presetContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  presetLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  presetLabelActive: {
    color: '#fff',
  },
  selectedTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  selectedTypeText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  infoGradient: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
  },
  startButton: {
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#FF671F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});