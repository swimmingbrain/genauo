// src/services/StorageService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Session, ImageCount } from '../types';

class StorageService {
  private readonly SESSIONS_KEY = '@genauo_sessions';
  private readonly SETTINGS_KEY = '@genauo_settings';

  // Session Management
  async getAllSessions(): Promise<Session[]> {
    try {
      const data = await AsyncStorage.getItem(this.SESSIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to load sessions:', error);
      return [];
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  async createSession(name: string, objectType?: string): Promise<Session> {
    const session: Session = {
      id: `session_${Date.now()}`,
      name,
      objectType,
      createdAt: new Date(),
      images: [],
      totalCount: 0,
    };

    const sessions = await this.getAllSessions();
    sessions.unshift(session); // Add to beginning
    await AsyncStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    
    return session;
  }

  async updateSession(session: Session): Promise<void> {
    const sessions = await this.getAllSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
      await AsyncStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.getAllSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    await AsyncStorage.setItem(this.SESSIONS_KEY, JSON.stringify(filtered));
  }

  async addImageToSession(
    sessionId: string,
    imagePath: string,
    count: number,
    detections: any[]
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const imageCount: ImageCount = {
      id: `img_${Date.now()}`,
      path: imagePath,
      count,
      timestamp: new Date(),
      corrections: 0,
      detections,
    };

    session.images.push(imageCount);
    session.totalCount = session.images.reduce((sum, img) => sum + img.count, 0);
    
    await this.updateSession(session);
  }

  async updateImageCount(
    sessionId: string,
    imageId: string,
    newCount: number,
    corrections: number
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');

    const image = session.images.find(img => img.id === imageId);
    if (image) {
      image.count = newCount;
      image.corrections = corrections;
      session.totalCount = session.images.reduce((sum, img) => sum + img.count, 0);
      await this.updateSession(session);
    }
  }

  // Settings Management
  async getSettings(): Promise<any> {
    try {
      const data = await AsyncStorage.getItem(this.SETTINGS_KEY);
      return data ? JSON.parse(data) : this.getDefaultSettings();
    } catch (error) {
      return this.getDefaultSettings();
    }
  }

  async saveSettings(settings: any): Promise<void> {
    await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
  }

  private getDefaultSettings() {
    return {
      sensitivity: 0.7,
      minObjectSize: 20,
      enableHaptics: true,
      enableSound: false,
      autoSave: true,
      theme: 'dark',
    };
  }

  // Image Management
  async saveImage(uri: string): Promise<string> {
    const filename = `genauo_${Date.now()}.jpg`;
    const destination = `${FileSystem.documentDirectory}${filename}`;
    
    await FileSystem.copyAsync({
      from: uri,
      to: destination,
    });
    
    return destination;
  }

  async deleteImage(uri: string): Promise<void> {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

  // Export functionality
  async exportSessionAsJSON(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');
    
    return JSON.stringify(session, null, 2);
  }

  async exportSessionAsCSV(sessionId: string): Promise<string> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('Session not found');
    
    let csv = 'Image ID,Count,Timestamp,Corrections\n';
    
    session.images.forEach(img => {
      csv += `${img.id},${img.count},${img.timestamp},${img.corrections}\n`;
    });
    
    csv += `\nTotal Count:,${session.totalCount}\n`;
    return csv;
  }
}

export default new StorageService();