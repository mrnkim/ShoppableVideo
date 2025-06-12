import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  createTwelveLabsClient, 
  TwelveLabsClient, 
  ProductDetection, 
  RelatedProduct,
  TwelveLabsVideo,
  TwelveLabsIndex
} from '@/lib/twelvelabs';

// Define the shape of the TwelveLabs context
interface TwelveLabsContextType {
  client: TwelveLabsClient | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Video operations
  videos: TwelveLabsVideo[];
  indexes: TwelveLabsIndex[];
  refreshVideos: () => Promise<void>;
  refreshIndexes: () => Promise<void>;
  uploadVideo: (file: File, filename: string) => Promise<TwelveLabsVideo>;
  indexVideo: (indexId: string, videoId: string) => Promise<any>;
  
  // Product detection operations
  detectProducts: (indexId: string, videoId: string) => Promise<ProductDetection[]>;
  findRelatedProducts: (options: {
    indexId: string;
    productId?: string;
    category?: string;
    productName?: string;
    videoId?: string;
    timeRange?: [number, number];
    limit?: number;
  }) => Promise<RelatedProduct[]>;
  
  // Loading states for specific operations
  isDetectingProducts: boolean;
  isFindingRelatedProducts: boolean;
  isUploadingVideo: boolean;
  isIndexingVideo: boolean;
  
  // Current operation states
  currentVideo: TwelveLabsVideo | null;
  currentIndex: TwelveLabsIndex | null;
  setCurrentVideo: (video: TwelveLabsVideo | null) => void;
  setCurrentIndex: (index: TwelveLabsIndex | null) => void;
}

// Create the context with default values
const TwelveLabsContext = createContext<TwelveLabsContextType>({
  client: null,
  isInitialized: false,
  isLoading: false,
  error: null,
  
  videos: [],
  indexes: [],
  refreshVideos: async () => {},
  refreshIndexes: async () => {},
  uploadVideo: async () => ({ _id: '', name: '', status: '', created_at: '', updated_at: '' }),
  indexVideo: async () => ({}),
  
  detectProducts: async () => [],
  findRelatedProducts: async () => [],
  
  isDetectingProducts: false,
  isFindingRelatedProducts: false,
  isUploadingVideo: false,
  isIndexingVideo: false,
  
  currentVideo: null,
  currentIndex: null,
  setCurrentVideo: () => {},
  setCurrentIndex: () => {},
});

// Custom hook to use the TwelveLabs context
export const useTwelveLabs = () => useContext(TwelveLabsContext);

interface TwelveLabsProviderProps {
  children: ReactNode;
  apiKey?: string;
  apiBaseUrl?: string;
}

export const TwelveLabsProvider: React.FC<TwelveLabsProviderProps> = ({ 
  children, 
  apiKey,
  apiBaseUrl
}) => {
  const [client, setClient] = useState<TwelveLabsClient | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Operation-specific loading states
  const [isDetectingProducts, setIsDetectingProducts] = useState<boolean>(false);
  const [isFindingRelatedProducts, setIsFindingRelatedProducts] = useState<boolean>(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);
  const [isIndexingVideo, setIsIndexingVideo] = useState<boolean>(false);
  
  // Data states
  const [videos, setVideos] = useState<TwelveLabsVideo[]>([]);
  const [indexes, setIndexes] = useState<TwelveLabsIndex[]>([]);
  const [currentVideo, setCurrentVideo] = useState<TwelveLabsVideo | null>(null);
  const [currentIndex, setCurrentIndex] = useState<TwelveLabsIndex | null>(null);

  // Initialize the client
  useEffect(() => {
    const initClient = async () => {
      try {
        // Try to get API key from environment if not provided
        const key = apiKey || process.env.NEXT_PUBLIC_TWELVELABS_API_KEY;
        const baseUrl = apiBaseUrl || process.env.NEXT_PUBLIC_TWELVELABS_API_URL;
        
        if (!key) {
          throw new Error('TwelveLabs API key is not configured');
        }
        
        const newClient = createTwelveLabsClient(key, baseUrl);
        setClient(newClient);
        setIsInitialized(true);
        
        // Load initial data
        await refreshData(newClient);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize TwelveLabs client');
        console.error('Error initializing TwelveLabs client:', err);
      }
    };
    
    initClient();
  }, [apiKey, apiBaseUrl]);

  // Refresh all data
  const refreshData = async (clientInstance: TwelveLabsClient) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch videos and indexes in parallel
      const [videosData, indexesData] = await Promise.all([
        clientInstance.listVideos(),
        clientInstance.listIndexes()
      ]);
      
      setVideos(videosData);
      setIndexes(indexesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch TwelveLabs data');
      console.error('Error fetching TwelveLabs data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh videos
  const refreshVideos = async () => {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const videosData = await client.listVideos();
      setVideos(videosData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch videos');
      console.error('Error fetching videos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh indexes
  const refreshIndexes = async () => {
    if (!client) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const indexesData = await client.listIndexes();
      setIndexes(indexesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch indexes');
      console.error('Error fetching indexes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload a video
  const uploadVideo = async (file: File, filename: string): Promise<TwelveLabsVideo> => {
    if (!client) {
      throw new Error('TwelveLabs client is not initialized');
    }
    
    setIsUploadingVideo(true);
    setError(null);
    
    try {
      const result = await client.uploadVideo(file, filename);
      
      // Refresh videos after upload
      await refreshVideos();
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload video';
      setError(errorMessage);
      console.error('Error uploading video:', err);
      throw new Error(errorMessage);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  // Index a video
  const indexVideo = async (indexId: string, videoId: string): Promise<any> => {
    if (!client) {
      throw new Error('TwelveLabs client is not initialized');
    }
    
    setIsIndexingVideo(true);
    setError(null);
    
    try {
      const result = await client.indexVideo(indexId, videoId);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to index video';
      setError(errorMessage);
      console.error('Error indexing video:', err);
      throw new Error(errorMessage);
    } finally {
      setIsIndexingVideo(false);
    }
  };

  // Detect products in a video
  const detectProducts = async (indexId: string, videoId: string): Promise<ProductDetection[]> => {
    if (!client) {
      throw new Error('TwelveLabs client is not initialized');
    }
    
    setIsDetectingProducts(true);
    setError(null);
    
    try {
      const products = await client.detectProducts(indexId, videoId);
      return products;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to detect products';
      setError(errorMessage);
      console.error('Error detecting products:', err);
      throw new Error(errorMessage);
    } finally {
      setIsDetectingProducts(false);
    }
  };

  // Find related products
  const findRelatedProducts = async (options: {
    indexId: string;
    productId?: string;
    category?: string;
    productName?: string;
    videoId?: string;
    timeRange?: [number, number];
    limit?: number;
  }): Promise<RelatedProduct[]> => {
    if (!client) {
      throw new Error('TwelveLabs client is not initialized');
    }
    
    setIsFindingRelatedProducts(true);
    setError(null);
    
    try {
      const relatedProducts = await client.findRelatedProducts(options);
      return relatedProducts;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to find related products';
      setError(errorMessage);
      console.error('Error finding related products:', err);
      throw new Error(errorMessage);
    } finally {
      setIsFindingRelatedProducts(false);
    }
  };

  // Context value
  const value: TwelveLabsContextType = {
    client,
    isInitialized,
    isLoading,
    error,
    
    videos,
    indexes,
    refreshVideos,
    refreshIndexes,
    uploadVideo,
    indexVideo,
    
    detectProducts,
    findRelatedProducts,
    
    isDetectingProducts,
    isFindingRelatedProducts,
    isUploadingVideo,
    isIndexingVideo,
    
    currentVideo,
    currentIndex,
    setCurrentVideo,
    setCurrentIndex,
  };

  return (
    <TwelveLabsContext.Provider value={value}>
      {children}
    </TwelveLabsContext.Provider>
  );
};

export default TwelveLabsContext;
