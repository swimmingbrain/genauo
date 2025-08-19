// src/types/index.ts
export interface Session {
    id: string;
    name: string;
    createdAt: Date;
    images: ImageCount[];
    totalCount: number;
    objectType?: string;
  }
  
  export interface ImageCount {
    id: string;
    path: string;
    count: number;
    timestamp: Date;
    corrections: number;
    detections: Detection[];
  }
  
  export interface Detection {
    id: string;
    bbox: BoundingBox;
    confidence: number;
    class?: string;
    manual?: boolean;
  }
  
  export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
  }
  
  export interface MLConfig {
    sensitivity: number;
    minObjectSize: number;
    maxOverlap: number;
    multiScale: boolean;
    scales: number[];
  }