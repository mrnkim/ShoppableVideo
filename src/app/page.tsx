"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ProductVideoPlayer } from '@/components/ProductVideoPlayer';
import ProductDetailSidebar from '@/components/ProductDetailSidebar';
import { ProductInfo } from '@/lib/types';
import { Info, ShoppingBag, ExpandMore } from '@mui/icons-material';
import { VideoItem, VideoDetail } from '@/lib/types';


export default function Home() {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [visibleProducts, setVisibleProducts] = useState<ProductInfo[]>([]);
  const [collapsedProducts, setCollapsedProducts] = useState<Record<string, boolean>>({});
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [isLoadingRelated, setIsLoadingRelated] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [manualToggled, setManualToggled] = useState<Record<string, boolean | undefined>>({});
  const [selectedProduct, setSelectedProduct] = useState<ProductInfo | null>(null);

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
      }
      // No videos found - just show empty state
    } catch (error) {
      console.error('Error loading videos:', error);
      // No fallback - just show empty state
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

    // Clear previous video's product data when loading new video detail
    setProducts([]);
    setVisibleProducts([]);
    setCollapsedProducts({});
    setSelectedProduct(null);
    setManualToggled({});
    setCurrentTime(0);
    setIsAnalyzingVideo(false);
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
        console.log('🎥 HLS URL set');
      } else {
        // If no HLS URL available, show error
        console.log('🎥 No HLS URL available');
        setVideoUrl('');
        console.warn('No HLS video URL available for this video');
      }
    } catch (error) {
      console.error('❌ Error loading video detail:', error);
      setVideoUrl('');
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
          console.log('✅ Using existing metadata');

          // Initialize all products as collapsed
          const initialCollapsedState: Record<string, boolean> = {};
          existingProducts.forEach((product: ProductInfo) => {
            const uniqueKey = `${product.brand}-${product.product_name}-${product.timeline[0]}-${product.timeline[1]}`;
            initialCollapsedState[uniqueKey] = true;
          });
          setCollapsedProducts(initialCollapsedState);
        } catch (parseError) {
          console.error('❌ Error parsing existing products:', parseError);
          setProducts([]);
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
        console.log('🔄 Setting products');
        setProducts(products);
        console.log('✅ Using real products');

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
      // No fallback - just show empty state
      console.log('🔄 No fallback data available');
      setProducts([]);
    } finally {
      setIsAnalyzingVideo(false);
    }
  }, []);

  // Handle video selection
  const handleVideoSelect = useCallback((videoId: string) => {
    console.log('🎬 Video selection changed to:', videoId);

    // Clear previous video's product data
    setProducts([]);
    setVisibleProducts([]);
    setCollapsedProducts({});
    setSelectedProduct(null);
    setManualToggled({});
    setCurrentTime(0);

    // Reset analysis state
    setIsAnalyzingVideo(false);

    // Update selected video and load details
    setSelectedVideoId(videoId);
    loadVideoDetail(videoId);
  }, [loadVideoDetail]);

  // Detect products in the video
  const handleDetectProducts = useCallback(async () => {
    // If we already have products from metadata analysis, use them
    if (products.length > 0) {
      return;
    }

    // No products available - just show empty state
    setProducts([]);
    setCollapsedProducts({});
  }, [products.length]);



  // Handle product selection
  const handleProductSelect = useCallback((product: ProductInfo) => {
    setSelectedProduct(product);
  }, []);

  const handleVisibleProductsChange = useCallback((products: ProductInfo[]) => {
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
      const currentProducts = products;

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
  }, [manualToggled, products]);



  // Handle video player ready
  const handlePlayerReady = useCallback((player: { seekTo: (time: number) => void }) => {
    setVideoPlayer(player);
  }, []);

  // Handle product click to seek to timeline
  const handleProductClick = useCallback((product: ProductInfo) => {
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



  // Get display name for video
  const getVideoDisplayName = (video: VideoItem) => {
    return video.system_metadata?.filename ||
           video.system_metadata?.video_title ||
           `Video ${video._id.slice(-8)}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header section - full width */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Shoppable Video Experience</h1>
        <p className="mb-6">
          Discover and purchase products directly from a video without interrupting playback
        </p>
        {/* Video Selection Dropdown */}
        <div className="mb-6">
          <div className="relative max-w">
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
      </div>

      {/* Video and Sidebar container */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Video Player */}
        <div className="lg:w-2/3">
          {videoUrl ? (
            <div className="">
              <ProductVideoPlayer
                videoUrl={videoUrl}
                products={products}
                onProductSelect={handleProductSelect}
                onVisibleProductsChange={handleVisibleProductsChange}
                onTimeUpdate={handleTimeUpdate}
                autoPlay={true}
                onPlayerReady={handlePlayerReady}
              />
            </div>
          ) : (
            <div className="w-full  bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">
                  {isAnalyzingVideo ? 'Analyzing video content...' : 'Loading video...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Product Detail Sidebar */}
        <div className="lg:w-1/3">
          <div className="h-[350px]">
            <ProductDetailSidebar
              products={products}
              collapsedProducts={collapsedProducts}
              manualToggled={manualToggled}
              onToggleCollapse={handleToggleCollapse}
              isLoading={isAnalyzingVideo}
              currentTime={currentTime}
              onProductClick={handleProductClick}
            />
          </div>
        </div>
      </div>

      {/* How it works section - full width */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">How it works</h2>
        <p className="text-sm text-blue-700 leading-relaxed">
          This app loads videos from a TwelveLabs Index and uses the TwelveLabs Analyze API to extract product information.
          The Analyze API detects all products appearing in the video, describes how they are presented, identifies their
          on-screen locations, and provides brand and pricing information when available. Product details are displayed
          in the sidebar with timestamps showing when each item appears in the video.
        </p>
      </div>
    </div>
  );
}
