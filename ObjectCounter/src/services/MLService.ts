// src/services/MLService.ts
import * as FileSystem from 'expo-file-system';
import { Detection } from '../types';
import { Alert } from 'react-native';

/**
 * Object detection using OpenAI's GPT-4 Vision API
 */
export class MLService {
  private isReady: boolean = false;
  private apiKey: string = '';
  
  async initialize(): Promise<void> {
    console.log('ML Service initialized with OpenAI Vision');
    this.isReady = true;
    return Promise.resolve();
  }

  /**
   * Set the OpenAI API key
   * In production, this should be stored securely and/or use a backend proxy
   */
  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Count objects using OpenAI Vision API
   */
  async detectObjects(imagePath: string, objectType: string = 'objects'): Promise<Detection[]> {
    if (!this.isReady) {
      await this.initialize();
    }

    if (!this.apiKey) {
      Alert.alert(
        'API Key Required',
        'Please set your OpenAI API key in the app settings.',
        [{ text: 'OK' }]
      );
      return [];
    }

    try {
      console.log('Starting object detection with OpenAI Vision...');
      
      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(imagePath);
      if (!fileInfo.exists) {
        throw new Error('Image file does not exist');
      }

      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(imagePath, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Call OpenAI Vision API
      const count = await this.callOpenAIVision(base64, objectType);
      
      // Generate detection objects based on count
      // Since GPT-4V doesn't provide bounding boxes, we'll create placeholder detections
      const detections = this.generatePlaceholderDetections(count);
      
      return detections;
    } catch (error) {
      console.error('Detection failed:', error);
      Alert.alert(
        'Detection Error',
        'Failed to count objects. Please try again.',
        [{ text: 'OK' }]
      );
      return [];
    }
  }

  /**
   * Call OpenAI Vision API to count objects
   */
  private async callOpenAIVision(base64Image: string, objectType: string): Promise<number> {
    const prompt = `Count the number of ALL ${objectType} in this image. 
    If counting is difficult or uncertain, make your best estimate.
    
    IMPORTANT: Respond with ONLY a single number. Nothing else. No explanations, no text, just the number.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
          temperature: 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const result = data.choices[0].message.content.trim();
      
      // Try to extract number from response
      let count = 0;
      try {
        count = parseInt(result, 10);
      } catch {
        // Try to extract any number from the response using regex
        const numbers = result.match(/\d+/);
        if (numbers && numbers.length > 0) {
          count = parseInt(numbers[0], 10);
        }
      }

      console.log(`OpenAI Vision detected ${count} ${objectType}`);
      return count;
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  }

  /**
   * Generate placeholder detection objects based on count
   * Since GPT-4V doesn't provide bounding boxes, we create a visual representation
   */
  private generatePlaceholderDetections(count: number): Detection[] {
    const detections: Detection[] = [];
    
    // Create a grid layout for visual representation
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    let index = 0;
    for (let row = 0; row < rows && index < count; row++) {
      for (let col = 0; col < cols && index < count; col++) {
        detections.push({
          id: `obj_${index}`,
          bbox: {
            x: 50 + (col * 100), // Spread out horizontally
            y: 50 + (row * 100), // Spread out vertically
            width: 60,
            height: 60,
          },
          confidence: 1.0,
          class: 'object',
          manual: false,
        });
        index++;
      }
    }
    
    return detections;
  }

  /**
   * Manual counting helper
   */
  createManualDetection(x: number, y: number, size: number = 40): Detection {
    return {
      id: `manual_${Date.now()}_${Math.random()}`,
      bbox: {
        x: x - size / 2,
        y: y - size / 2,
        width: size,
        height: size,
      },
      confidence: 1.0,
      class: 'manual',
      manual: true,
    };
  }

  dispose() {
    this.isReady = false;
  }
}

// Export singleton instance
const mlService = new MLService();

// Helper for manual detection (kept for compatibility)
export class ManualCountingHelper {
  static createManualDetection(x: number, y: number, size: number = 40): Detection {
    return mlService.createManualDetection(x, y, size);
  }
}

export default mlService;