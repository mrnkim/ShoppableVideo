"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProductVideoPlayer } from '@/components/ProductVideoPlayer';
import ProductDetailSidebar from '@/components/ProductDetailSidebar';

import { ProductDetection } from '@/lib/twelvelabs';

import { Info, ShoppingBag, ExpandMore } from '@mui/icons-material';

// Types for video data from TwelveLabs API
interface VideoItem {
  _id: string;
  created_at: string;
  system_metadata?: {
    filename?: string;
    duration?: number;
    video_title?: string;
    fps?: number;
    height?: number;
    width?: number;
    size?: number;
    model_names?: string[];
  };
  hls?: {
    video_url?: string;
    thumbnail_urls?: string[];
    status?: string;
    updated_at?: string;
  };
}

interface VideoDetail {
  _id: string;
  index_id?: string;
  hls?: {
    video_url?: string;
    thumbnail_urls?: string[];
    status?: string;
    updated_at?: string;
  };
  system_metadata?: {
    filename?: string;
    duration?: number;
    video_title?: string;
    fps?: number;
    height?: number;
    width?: number;
    size?: number;
    model_names?: string[];
  };
  user_metadata?: Record<string, unknown>;
  source?: Record<string, unknown>;
  embedding?: Record<string, unknown>;
}



// Mock products for demonstration when API is not available
const MOCK_PRODUCTS: ProductDetection[] =
[
  {
    "timeline": [13.0, 16.0],
    "brand": "Jennie-O",
    "product_name": "93% lean-7% fat fresh-ground turkey",
    "location": [5.2, 18.5, 7.8, 9.3], // [100/1920*100, 200/1080*100, 150/1920*100, 100/1080*100]
    "price": "Not specified",
    "description": "The ground turkey is displayed on a countertop and its packaging label is shown, highlighting its nutritional information."
    },
    {
    "timeline": [13.0, 16.0],
    "brand": "Unknown",
    "product_name": "Whipped Low Fat Cottage Cheese Spreadable",
    "location": [7.8, 20.4, 5.2, 3.7], // [150/1920*100, 220/1080*100, 100/1920*100, 40/1080*100]
    "price": "Not specified",
    "description": "The cottage cheese is displayed on a countertop and later its nutrition facts label is focused on in a close-up shot."
    },
    {
    "timeline": [13.0, 16.0],
    "brand": "Unknown",
    "product_name": "White eggs",
    "location": [10.4, 22.2, 3.1, 3.7], // [200/1920*100, 240/1080*100, 60/1920*100, 40/1080*100]
    "price": "Not specified",
    "description": "The eggs are shown nestled within a cardboard carton and later used in the recipe."
    },
    {
    "timeline": [13.0, 16.0],
    "brand": "Unknown",
    "product_name": "Kale leaves",
    "location": [13.0, 24.1, 3.6, 4.6], // [250/1920*100, 260/1080*100, 70/1920*100, 50/1080*100]
    "price": "Not specified",
    "description": "The kale leaves are displayed on a countertop and later added to the skillet with the ground turkey mixture."
    },
    {
    "timeline": [216.0, 224.0],
    "brand": "Unknown",
    "product_name": "Flat piece of dough",
    "location": [15.6, 25.9, 5.2, 4.6], // [300/1920*100, 280/1080*100, 100/1920*100, 50/1080*100]
    "price": "Not specified",
    "description": "The dough is shown resting on parchment paper next to a rolling pin, indicating it is part of the burrito-making process."
    }
]



export default function Home() {



  // State variables
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [products, setProducts] = useState<ProductDetection[]>([]);
  const [visibleProducts, setVisibleProducts] = useState<ProductDetection[]>([]);
  const [collapsedProducts, setCollapsedProducts] = useState<Record<string, boolean>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [isLoadingRelated, setIsLoadingRelated] = useState<boolean>(false);
  const [useMockData, setUseMockData] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [manualToggled, setManualToggled] = useState<Record<string, boolean | undefined>>({});

  const [selectedProduct, setSelectedProduct] = useState<ProductDetection | null>(null);

  // New state for video management
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [isLoadingVideoDetail, setIsLoadingVideoDetail] = useState<boolean>(false);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState<boolean>(false);
  const [videoDetail, setVideoDetail] = useState<VideoDetail | null>(null);
  const [videoPlayer, setVideoPlayer] = useState<{ seekTo: (time: number) => void } | null>(null);

  // Load videos from TwelveLabs index
  const loadVideos = useCallback(async () => {
    const defaultIndexId = process.env.NEXT_PUBLIC_DEFAULT_INDEX_ID;
    if (!defaultIndexId) {
      console.error('Default index ID not configured');
      setUseMockData(true);
      setVideoUrl('/breakfast_burrito.mp4');
      return;
    }

    setIsLoadingVideos(true);
    try {
      const response = await fetch(`/api/videos?index_id=${defaultIndexId}&limit=50`);
      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.statusText}`);
      }

      const data = await response.json();
      setVideos(data.data || []);

      // Select the most recent video by default (first in the list since API returns newest first)
      if (data.data && data.data.length > 0) {
        setSelectedVideoId(data.data[0]._id);
      } else {
        // No videos found, use mock data
        setUseMockData(true);
        setVideoUrl('/breakfast_burrito.mp4');
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      console.log('🔄 Setting useMockData=true due to video loading error');
      setUseMockData(true);
      setVideoUrl('/breakfast_burrito.mp4');
    } finally {
      setIsLoadingVideos(false);
    }
  }, []);

  // Load video detail when a video is selected
  const loadVideoDetail = useCallback(async (videoId: string) => {
    const defaultIndexId = '688020fe934487793c56c6a7'; // From your .env file
    if (!defaultIndexId || !videoId) {
      return;
    }

    setIsLoadingVideoDetail(true);
    try {
      console.log('🎬 Loading video detail for videoId:', videoId);
      const response = await fetch(`/api/videos/${videoId}?indexId=${defaultIndexId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch video detail: ${response.statusText}`);
      }

      const data = await response.json();
      setVideoDetail(data);
      console.log('📹 Video detail loaded:', data);

      // Check if custom metadata exists and generate if needed BEFORE setting video URL
      console.log('🔍 Checking metadata before setting video URL...');
      await checkAndGenerateMetadata(videoId, defaultIndexId, data);

      // Set video URL from HLS data if available (AFTER metadata check)
      if (data.hls?.video_url) {
        console.log('🎥 Setting HLS video URL:', data.hls.video_url);
        setVideoUrl(data.hls.video_url);
        console.log('🎥 HLS URL set, keeping useMockData as is');
      } else {
        // If no HLS URL available, use mock video
        console.log('🎥 No HLS URL, using mock video');
        setVideoUrl('/breakfast_burrito.mp4');
        setUseMockData(true);
        console.warn('No HLS video URL available for this video, using mock video');
      }
    } catch (error) {
      console.error('❌ Error loading video detail:', error);
      setVideoUrl('/breakfast_burrito.mp4');
      setUseMockData(true);
    } finally {
      setIsLoadingVideoDetail(false);
    }
  }, []);

  // Check and generate metadata if needed
  const checkAndGenerateMetadata = useCallback(async (videoId: string, indexId: string, videoData: VideoDetail, forceReanalyze = false) => {
    // Check if custom metadata already exists (unless forceReanalyze is true)
    if (!forceReanalyze && videoData.user_metadata && Object.keys(videoData.user_metadata).length > 0) {
      console.log('✅ Custom metadata already exists for this video:', videoData.user_metadata);
      // Use existing metadata
      if (videoData.user_metadata.products) {
        let existingProducts;
        try {
          // Parse products if it's stored as JSON string
          if (typeof videoData.user_metadata.products === 'string') {
            existingProducts = JSON.parse(videoData.user_metadata.products);
          } else {
            existingProducts = videoData.user_metadata.products;
          }

          console.log('📦 Using existing products from metadata:', existingProducts);
          setProducts(existingProducts);
          setUseMockData(false);
          console.log('✅ Set useMockData=false for existing metadata');

          // Initialize all products as collapsed
          const initialCollapsedState: Record<string, boolean> = {};
          existingProducts.forEach((product: ProductDetection) => {
            const uniqueKey = `${product.brand}-${product.product_name}-${product.timeline[0]}-${product.timeline[1]}`;
            initialCollapsedState[uniqueKey] = true;
          });
          setCollapsedProducts(initialCollapsedState);
        } catch (parseError) {
          console.error('❌ Error parsing existing products:', parseError);
          setUseMockData(true);
        }
      }
      return;
    }

    console.log('🔍 No custom metadata found or force reanalyze requested, generating product analysis...');
    setIsAnalyzingVideo(true);

    try {
      // Call analyze API to generate product information
      console.log('📡 Calling analyze API for videoId:', videoId);
      const analyzeResponse = await fetch(`/api/analyze?videoId=${videoId}${forceReanalyze ? '&forceReanalyze=true' : ''}`);
      console.log('📡 Analyze API response status:', analyzeResponse.status);

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        console.error('❌ Analyze API error:', errorText);
        throw new Error(`Failed to analyze video: ${analyzeResponse.statusText} - ${errorText}`);
      }

      const analyzeData = await analyzeResponse.json();
      console.log('📊 Analysis result:', analyzeData);

      // Extract products from the analysis response
      if (analyzeData.data) {
        console.log('📄 Raw data string:', analyzeData.data);

                // Parse the response data
        let products = [];
        try {
          let jsonString = analyzeData.data;

          // Check if it's still wrapped in markdown code blocks (fallback)
          if (jsonString.includes('```json')) {
            console.log('🔧 Detected markdown formatting, cleaning...');
            jsonString = jsonString
              .replace(/```json\n?/g, '')  // Remove opening ```json
              .replace(/```\n?/g, '')      // Remove closing ```
              .trim();                     // Remove extra whitespace
          }

          console.log('🔧 JSON string to parse:', jsonString);

          products = JSON.parse(jsonString);
          console.log('📦 Parsed products:', products);

          if (!Array.isArray(products)) {
            throw new Error('Parsed data is not an array');
          }
        } catch (parseError) {
          console.error('❌ Error parsing JSON from analysis response:', parseError);
          throw new Error(`Failed to parse products data: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
        }

        // Save the generated metadata
        console.log('💾 Saving metadata to TwelveLabs...');
        const saveRequestBody = {
          videoId: videoId,
          indexId: indexId,
          metadata: {
            products: products,
            analyzed_at: new Date().toISOString(),
            reanalyzed: forceReanalyze
          }
        };
        console.log('💾 Save request body:', saveRequestBody);

        const saveResponse = await fetch('/api/videos/saveMetadata', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saveRequestBody)
        });

        console.log('💾 Save API response status:', saveResponse.status);

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          console.error('❌ Save API error:', errorText);
          throw new Error(`Failed to save metadata: ${saveResponse.statusText} - ${errorText}`);
        }

        const saveResult = await saveResponse.json();
        console.log('✅ Metadata saved successfully:', saveResult);

        // Update local state with the generated products
        console.log('🔄 Updating local state with generated products:', products);
        console.log('🔄 Before: useMockData =', useMockData);
        setProducts(products);
        setUseMockData(false);
        console.log('✅ Mock data disabled, using real products');
        console.log('🔄 After setUseMockData(false) called');

        // Initialize all products as collapsed
        const initialCollapsedState: Record<string, boolean> = {};
        products.forEach(product => {
          const uniqueKey = `${product.brand}-${product.product_name}-${product.timeline[0]}-${product.timeline[1]}`;
          initialCollapsedState[uniqueKey] = true;
        });
        setCollapsedProducts(initialCollapsedState);
      } else {
        console.warn('⚠️ No data field in analysis response');
        throw new Error('No data field received from analysis');
      }
    } catch (error) {
      console.error('❌ Error generating metadata:', error);
      // Fallback to mock data
      console.log('🔄 Falling back to mock data');
      setUseMockData(true);
      setProducts(MOCK_PRODUCTS);
    } finally {
      setIsAnalyzingVideo(false);
    }
  }, []);

  // Handle video selection
  const handleVideoSelect = useCallback((videoId: string) => {
    setSelectedVideoId(videoId);
    loadVideoDetail(videoId);
  }, [loadVideoDetail]);

  // Detect products in the video
  const handleDetectProducts = useCallback(async () => {
    // If we already have products from metadata analysis, use them
    if (products.length > 0 && !useMockData) {
      return;
    }

    // Otherwise, use mock data
    setUseMockData(true);
    setProducts(MOCK_PRODUCTS);

    // Initialize all products as collapsed
    const initialCollapsedState: Record<string, boolean> = {};
    MOCK_PRODUCTS.forEach(product => {
      const uniqueKey = `${product.brand}-${product.product_name}-${product.timeline[0]}-${product.timeline[1]}`;
      initialCollapsedState[uniqueKey] = true;
    });
    setCollapsedProducts(initialCollapsedState);
  }, [products.length, useMockData]);



  // Handle product selection
  const handleProductSelect = useCallback((product: ProductDetection) => {
    setSelectedProduct(product);
  }, []);

  const handleVisibleProductsChange = useCallback((products: ProductDetection[]) => {
    setVisibleProducts(products);
  }, []);

  const handleToggleCollapse = (productName: string, brand: string, timeline: [number, number]) => {
    const uniqueKey = `${brand}-${productName}-${timeline[0]}-${timeline[1]}`;
    setCollapsedProducts((prev) => ({
      ...prev,
      [uniqueKey]: !prev[uniqueKey],
    }));
    setManualToggled((prev) => ({
      ...prev,
      [uniqueKey]: true,
    }));
  };

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
    setCollapsedProducts((prev) => {
      let changed = false;
      const newState = { ...prev };
      const currentProducts = useMockData ? MOCK_PRODUCTS : products;

      currentProducts.forEach((p) => {
        const uniqueKey = `${p.brand}-${p.product_name}-${p.timeline[0]}-${p.timeline[1]}`;
        if (time >= p.timeline[0] && time <= p.timeline[1]) {
          // 구간 내 진입 시 수동 토글 초기화하고 자동 펼침
          if (manualToggled[uniqueKey]) {
            setManualToggled((prevManual) => ({
              ...prevManual,
              [uniqueKey]: undefined,
            }));
          }
          if (prev[uniqueKey] !== false) {
            newState[uniqueKey] = false;
            changed = true;
          }
        } else if (time > p.timeline[1]) {
          if (manualToggled[uniqueKey]) {
            // 수동 토글이 있으면 자동 동작 무시
            return;
          }
          if (prev[uniqueKey] !== true) {
            newState[uniqueKey] = true;
            changed = true;
          }
        }
      });
      return changed ? newState : prev;
    });
  }, [manualToggled, useMockData, products]);



  // Handle video player ready
  const handlePlayerReady = useCallback((player: { seekTo: (time: number) => void }) => {
    setVideoPlayer(player);
  }, []);

  // Handle product click to seek to timeline
  const handleProductClick = useCallback((product: ProductDetection) => {
    if (videoPlayer) {
      videoPlayer.seekTo(product.timeline[0]);
    }
  }, [videoPlayer]);

  // Initialize videos when component mounts
  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  // Load video detail when selected video changes
  useEffect(() => {
    if (selectedVideoId) {
      loadVideoDetail(selectedVideoId);
    }
  }, [selectedVideoId, loadVideoDetail]);

  // Initialize products when component mounts
  useEffect(() => {
    // Detect products with a small delay to ensure video is loaded
    // This helps maintain the <2s latency requirement
    const timer = setTimeout(() => {
      handleDetectProducts();
    }, 500);

    return () => clearTimeout(timer);
  }, [handleDetectProducts]);

  // Debug useEffect to track useMockData changes
  useEffect(() => {
    console.log('🔍 useMockData changed to:', useMockData);
  }, [useMockData]);

  // Get display name for video
  const getVideoDisplayName = (video: VideoItem) => {
    return video.system_metadata?.filename ||
           video.system_metadata?.video_title ||
           `Video ${video._id.slice(-8)}`;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-2/3">
        <h1 className="text-2xl font-bold mb-2">Shoppable Video Experience</h1>
        <p className="mb-6">
          Discover and purchase products directly from a video without interrupting playback
        </p>
        {/* Video Selection Dropdown */}
        <div className="mb-3">
          <div className="relative">
            <select
              id="video-select"
              value={selectedVideoId}
              onChange={(e) => handleVideoSelect(e.target.value)}
              disabled={isLoadingVideos}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed appearance-none"
            >
              {isLoadingVideos ? (
                <option value="">Loading videos...</option>
              ) : videos.length === 0 ? (
                <option value="">No videos available</option>
              ) : (
                videos.map((video) => (
                  <option key={video._id} value={video._id}>
                    {getVideoDisplayName(video)}
                  </option>
                ))
              )}
            </select>
            <ExpandMore className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>



        {/* Video Player with Product Overlays */}
        {videoUrl ? (
          <ProductVideoPlayer
            videoUrl={videoUrl}
            products={useMockData ? MOCK_PRODUCTS : products}
            onProductSelect={handleProductSelect}
            onVisibleProductsChange={handleVisibleProductsChange}
            onTimeUpdate={handleTimeUpdate}
            autoPlay={true}
            onPlayerReady={handlePlayerReady}
          />
        ) : (
          <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">
                {isAnalyzingVideo ? 'Analyzing video content...' : 'Loading video...'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Product Detail Sidebar - Aligned with video player */}
      <div className="lg:w-1/3 lg:pt-[calc(2rem+1.5rem+1.5rem+1.5rem+1.5rem)]">
        <ProductDetailSidebar
          products={useMockData ? MOCK_PRODUCTS : products}
          collapsedProducts={collapsedProducts}
          onToggleCollapse={handleToggleCollapse}
          currentTime={currentTime}
          onProductClick={handleProductClick}
        />
      </div>
    </div>
  );
}
