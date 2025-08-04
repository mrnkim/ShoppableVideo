"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProductVideoPlayer } from '@/components/ProductVideoPlayer';
import ProductDetailSidebar from '@/components/ProductDetailSidebar';
import ShoppingCart from '@/components/ShoppingCart';
import { ProductDetection, RelatedProduct } from '@/lib/twelvelabs';
import { useCart } from '@/contexts/CartContext';
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
    "location": [960, 540, 100, 50],
    "price": "Not specified",
    "description": "The ground turkey is displayed on a countertop and its packaging label is shown, highlighting its nutritional information."
    },
    {
    "timeline": [13.0, 16.0],
    "brand": "Unknown",
    "product_name": "Whipped Low Fat Cottage Cheese Spreadable",
    "location": [1000, 560, 80, 40],
    "price": "Not specified",
    "description": "The cottage cheese is displayed on a countertop and later its nutrition facts label is focused on in a close-up shot."
    },
    {
    "timeline": [13.0, 16.0],
    "brand": "Unknown",
    "product_name": "White eggs",
    "location": [1040, 580, 60, 40],
    "price": "Not specified",
    "description": "The eggs are shown nestled within a cardboard carton and later used in the recipe."
    },
    {
    "timeline": [13.0, 16.0],
    "brand": "Unknown",
    "product_name": "Kale leaves",
    "location": [1100, 600, 70, 50],
    "price": "Not specified",
    "description": "The kale leaves are displayed on a countertop and later added to the skillet with the ground turkey mixture."
    },
    {
    "timeline": [216.0, 224.0],
    "brand": "Unknown",
    "product_name": "Flat piece of dough",
    "location": [960, 540, 100, 50],
    "price": "Not specified",
    "description": "The dough is shown resting on parchment paper next to a rolling pin, indicating it is part of the burrito-making process."
    }
]



export default function Home() {

  // Cart context
  const { addItem, updateQuantity, items, isCartOpen, toggleCart, clearCart } = useCart();

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
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductDetection | null>(null);

  // New state for video management
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [isLoadingVideoDetail, setIsLoadingVideoDetail] = useState<boolean>(false);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState<boolean>(false);
  const [videoDetail, setVideoDetail] = useState<VideoDetail | null>(null);

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
  const checkAndGenerateMetadata = useCallback(async (videoId: string, indexId: string, videoData: VideoDetail) => {
    // Check if custom metadata already exists
    if (videoData.user_metadata && Object.keys(videoData.user_metadata).length > 0) {
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
        } catch (parseError) {
          console.error('❌ Error parsing existing products:', parseError);
          setUseMockData(true);
        }
      }
      return;
    }

    console.log('🔍 No custom metadata found, generating product analysis...');
    setIsAnalyzingVideo(true);

    try {
      // Call analyze API to generate product information
      console.log('📡 Calling analyze API for videoId:', videoId);
      const analyzeResponse = await fetch(`/api/analyze?videoId=${videoId}`);
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
            analyzed_at: new Date().toISOString()
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
  }, [products.length, useMockData]);

  // Find related products when a product is selected
  const handleFindRelatedProducts = useCallback(async (product: ProductDetection) => {
    // For now, set empty array since we're not using related products
    setRelatedProducts([]);
  }, []);

  // Handle product selection
  const handleProductSelect = useCallback((product: ProductDetection) => {
    setSelectedProduct(product);
    handleFindRelatedProducts(product);
  }, [handleFindRelatedProducts]);

  const handleVisibleProductsChange = useCallback((products: ProductDetection[]) => {
    setVisibleProducts(products);
  }, []);

  const handleToggleCollapse = (productName: string, brand: string) => {
    const uniqueKey = `${brand}-${productName}`;
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
        const uniqueKey = `${p.brand}-${p.product_name}`;
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

  // Handle related product selection
  const handleRelatedProductSelect = (product: RelatedProduct) => {
    addItem(product);
  };

  // Handle checkout
  const handleCheckout = () => {
    alert("Checkout process would be implemented here in a real application");
    clearCart();
  };

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
        <h1 className="text-2xl font-bold mb-4">Shoppable Video Experience</h1>

        {/* Video Selection Dropdown */}
        <div className="mb-6">
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

        <div className="flex items-center mb-6 text-sm">
          <div className={`px-3 py-1 rounded-full mr-3 flex items-center ${useMockData ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
            <span className="w-2 h-2 rounded-full mr-2 bg-current"></span>
            {useMockData ? 'Demo Mode' : 'API Connected'}
          </div>

          {/* Show only one status based on priority */}
          {isAnalyzingVideo ? (
            <div className="flex items-center text-purple-600">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
              Analyzing Products...
            </div>
          ) : isLoadingVideoDetail ? (
            <div className="flex items-center text-blue-600">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
              Loading Video...
            </div>
          ) : isLoadingProducts ? (
            <div className="flex items-center text-blue-600">
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
              Detecting Products...
            </div>
          ) : null}
        </div>

        <p className="text-gray-600 mb-6">
          Discover and purchase products directly from this video without interrupting playback.
        </p>

        {/* Video Player with Product Overlays */}
        {videoUrl ? (
          <ProductVideoPlayer
            videoUrl={videoUrl}
            products={useMockData ? MOCK_PRODUCTS : products}
            onProductSelect={handleProductSelect}
            onVisibleProductsChange={handleVisibleProductsChange}
            onTimeUpdate={handleTimeUpdate}
            autoPlay={true}
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

        {/* Video Description */}
        {/* <div className="mt-6 p-4 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold">About This Video</h2>
          <p className="text-gray-600 mt-2">
            This demo showcases how AI-powered video understanding can transform the viewing experience
            into a shopping opportunity. Products are detected in real-time using TwelveLabs' deep
            semantic search capabilities, allowing viewers to discover and purchase items without
            interrupting their viewing experience.
          </p>
        </div> */}

        {/* Technology Explanation */}
        {/* <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800">Powered by TwelveLabs AI</h2>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded shadow-sm">
              <h3 className="font-medium text-blue-700">TwelveLabs Search API</h3>
              <p className="text-sm text-gray-600 mt-1">
                Enables natural language queries like "red dress in dance scene" to pinpoint products with frame accuracy.
              </p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <h3 className="font-medium text-blue-700">TwelveLabs Analyze API</h3>
              <p className="text-sm text-gray-600 mt-1">
                Creates tailored product descriptions using video context (e.g., "Windproof jacket shown in mountain summit scene").
              </p>
            </div>
            <div className="bg-white p-3 rounded shadow-sm">
              <h3 className="font-medium text-blue-700">TwelveLabs Embed API</h3>
              <p className="text-sm text-gray-600 mt-1">
                Powers "Similar Styles" recommendations by analyzing visual/textual product attributes.
              </p>
            </div>
          </div>
        </div> */}
      </div>

      <div className="lg:w-1/3">
        {/* Product Detail Sidebar */}
        <ProductDetailSidebar
          products={(useMockData ? MOCK_PRODUCTS : products).filter(p => currentTime >= p.timeline[0])}
          collapsedProducts={collapsedProducts}
          onToggleCollapse={handleToggleCollapse}
          relatedProducts={[]}
          onClose={() => {}}
          onAddToCart={() => {}}
          onRelatedProductSelect={() => {}}
          isLoading={false}
        />

        {/* Shopping Cart */}
        {/* <ShoppingCart
          items={items}
          onUpdateQuantity={updateQuantity}
          onCheckout={handleCheckout}
          isOpen={isCartOpen}
          onToggle={toggleCart}
        /> */}

        {/* Additional Info */}
        {/* {!selectedProduct && (
          <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-700 mb-2">How It Works</h3>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
              <li>Play the video to see product markers appear</li>
              <li>Click on a product marker to view details</li>
              <li>Add products to your cart</li>
              <li>Explore similar product recommendations</li>
              <li>Complete your purchase without leaving the video</li>
            </ol>
          </div>
        )} */}
      </div>
    </div>
  );
}
