"use client";

import React, { useState, useEffect } from 'react';
import { Refresh, PlayArrow, Settings } from '@mui/icons-material';
import { VideoItem, VideoDetail } from '@/lib/types';


export default function AdminPage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoDetails, setVideoDetails] = useState<Record<string, VideoDetail>>({});
  const [analyzeResponses, setAnalyzeResponses] = useState<Record<string, any>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [analyzingVideos, setAnalyzingVideos] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Load videos from TwelveLabs index
  const loadVideos = async () => {
    const defaultIndexId = process.env.NEXT_PUBLIC_DEFAULT_INDEX_ID;
    if (!defaultIndexId) {
      setError('Default index ID not configured');
      return;
    }

    setIsLoadingVideos(true);
    setError(null);

    try {
      const response = await fetch(`/api/videos?index_id=${defaultIndexId}&limit=50`);
      if (!response.ok) {
        throw new Error(`Failed to fetch videos: ${response.statusText}`);
      }

      const data = await response.json();
      setVideos(data.data || []);
    } catch (error) {
      console.error('Error loading videos:', error);
      setError(error instanceof Error ? error.message : 'Failed to load videos');
    } finally {
      setIsLoadingVideos(false);
    }
  };

  // Load video details
  const loadVideoDetails = async (videoId: string) => {
    const defaultIndexId = process.env.NEXT_PUBLIC_DEFAULT_INDEX_ID;
    if (!defaultIndexId || !videoId) {
      return;
    }

    setIsLoadingDetails(true);
    try {
      const response = await fetch(`/api/videos/${videoId}?indexId=${defaultIndexId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch video detail: ${response.statusText}`);
      }

      const data = await response.json();
      setVideoDetails(prev => ({
        ...prev,
        [videoId]: data
      }));
    } catch (error) {
      console.error('Error loading video detail:', error);
      setError(error instanceof Error ? error.message : 'Failed to load video detail');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Reanalyze video
  const reanalyzeVideo = async (videoId: string) => {
    const defaultIndexId = process.env.NEXT_PUBLIC_DEFAULT_INDEX_ID;
    if (!defaultIndexId || !videoId) {
      return;
    }

    setAnalyzingVideos(prev => new Set(prev).add(videoId));
    setError(null);

    try {
      // Call analyze API with forceReanalyze=true
      console.log('🔄 Reanalyzing video:', videoId);
      const analyzeResponse = await fetch(`/api/analyze?videoId=${videoId}&forceReanalyze=true`);

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        throw new Error(`Failed to reanalyze video: ${analyzeResponse.statusText} - ${errorText}`);
      }

      const analyzeData = await analyzeResponse.json();
      console.log('📊 Reanalysis result:', analyzeData);

      // Store the analyze response for display
      setAnalyzeResponses(prev => ({
        ...prev,
        [videoId]: analyzeData
      }));

      // Extract products from the analysis response
      if (analyzeData.data) {
        let products = [];
        try {
          let jsonString = analyzeData.data;

          // Check if it's still wrapped in markdown code blocks
          if (jsonString.includes('```json')) {
            jsonString = jsonString
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim();
          }

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
        console.log('💾 Saving reanalyzed metadata to TwelveLabs...');
        const saveRequestBody = {
          videoId: videoId,
          indexId: defaultIndexId,
          metadata: {
            products: products,
            analyzed_at: new Date().toISOString(),
            reanalyzed: true
          }
        };

        const saveResponse = await fetch('/api/videos/saveMetadata', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(saveRequestBody)
        });

        if (!saveResponse.ok) {
          const errorText = await saveResponse.text();
          throw new Error(`Failed to save reanalyzed metadata: ${saveResponse.statusText} - ${errorText}`);
        }

        const saveResult = await saveResponse.json();
        console.log('✅ Reanalyzed metadata saved successfully:', saveResult);

        // Reload video details to show updated metadata
        await loadVideoDetails(videoId);
      } else {
        throw new Error('No data field received from analysis');
      }
    } catch (error) {
      console.error('❌ Error reanalyzing video:', error);
      setError(error instanceof Error ? error.message : 'Failed to reanalyze video');
    } finally {
      setAnalyzingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };

  // Get display name for video
  const getVideoDisplayName = (video: VideoItem) => {
    return video.system_metadata?.filename ||
           video.system_metadata?.video_title ||
           `Video ${video._id.slice(-8)}`;
  };

  // Check if video has existing metadata
  const hasExistingMetadata = (videoId: string) => {
    const detail = videoDetails[videoId];
    return detail?.user_metadata && Object.keys(detail.user_metadata).length > 0;
  };

  // Get product count from metadata
  const getProductCount = (videoId: string) => {
    const detail = videoDetails[videoId];
    if (detail?.user_metadata?.products) {
      try {
        const products = typeof detail.user_metadata.products === 'string'
          ? JSON.parse(detail.user_metadata.products)
          : detail.user_metadata.products;
        return Array.isArray(products) ? products.length : 0;
      } catch {
        return 0;
      }
    }
    return 0;
  };

  const toggleRowExpansion = (videoId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const hasAnalyzeResponse = (videoId: string) => {
    return analyzeResponses[videoId] !== undefined;
  };

  // Check if video has products in metadata
  const hasProductsData = (videoId: string) => {
    const detail = videoDetails[videoId];
    return detail?.user_metadata?.products !== undefined;
  };

  // Load videos on component mount
  useEffect(() => {
    loadVideos();
  }, []);

  // Load details for videos that don't have details yet
  useEffect(() => {
    videos.forEach(video => {
      if (!videoDetails[video._id] && !isLoadingDetails) {
        loadVideoDetails(video._id);
      }
    });
  }, [videos, videoDetails, isLoadingDetails]);

  return (
    <div className="min-w-90% min-h-screen bg-gray-50 py-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">Manage video analysis and product detection</p>
            </div>
            <button
              onClick={loadVideos}
              disabled={isLoadingVideos}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Refresh className={`mr-2 ${isLoadingVideos ? 'animate-spin' : ''}`} />
              Refresh Videos
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {isLoadingVideos ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
              <span className="text-gray-600">Loading videos...</span>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No videos found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Video
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Analysis Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Products
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {videos.map((video) => {
                    const hasMetadata = hasExistingMetadata(video._id);
                    const productCount = getProductCount(video._id);
                    const isAnalyzing = analyzingVideos.has(video._id);

                    return [
                      <tr key={video._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <PlayArrow className="text-gray-400" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {getVideoDisplayName(video)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {video._id.slice(-8)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {video.system_metadata?.duration
                            ? `${Math.floor(video.system_metadata.duration / 60)}:${Math.floor(video.system_metadata.duration % 60).toString().padStart(2, '0')}`
                            : 'Unknown'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            hasMetadata
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {hasMetadata ? 'Analyzed' : 'Not Analyzed'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {hasMetadata ? `${productCount} products` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => reanalyzeVideo(video._id)}
                            disabled={isAnalyzing}
                            className={`flex items-center px-3 py-1 rounded-md text-sm border transition-colors ${
                              isAnalyzing
                                ? 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                                : 'bg-black text-white border-black hover:bg-gray-800 hover:border-gray-800'
                            }`}
                          >
                            {isAnalyzing ? (
                              <>
                                <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Refresh className="w-3 h-3 mr-1" />
                                Reanalyze
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {hasProductsData(video._id) || hasAnalyzeResponse(video._id) ? (
                            <button
                              onClick={() => toggleRowExpansion(video._id)}
                              className="flex items-center px-3 py-1 rounded-md text-sm border bg-black text-white border-black hover:bg-gray-800 hover:border-gray-800 transition-colors"
                            >
                              {expandedRows.has(video._id) ? 'Hide' : 'Show'} {hasAnalyzeResponse(video._id) ? 'Response' : 'Products'}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">No data yet</span>
                          )}
                        </td>
                      </tr>,
                      ...(expandedRows.has(video._id) && (hasAnalyzeResponse(video._id) || hasProductsData(video._id)) ? [
                        <tr key={`${video._id}-expanded`}>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="bg-white border rounded-lg p-4">
                              {hasAnalyzeResponse(video._id) ? (
                                <>
                                  <h4 className="font-semibold text-gray-900 mb-3">Analyze API Response</h4>
                                  <div className="bg-gray-100 rounded p-3 overflow-auto max-h-96">
                                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                                      {JSON.stringify(analyzeResponses[video._id], null, 2)}
                                    </pre>
                                  </div>
                                </>
                              ) : hasProductsData(video._id) ? (
                                <>
                                  <h4 className="font-semibold text-gray-900 mb-3">Products Data</h4>
                                  <div className="bg-gray-100 rounded p-3 overflow-auto max-h-96">
                                    <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                                      {(() => {
                                        try {
                                          const products = videoDetails[video._id]?.user_metadata?.products;
                                          if (!products) return 'No products data';
                                          const parsed = typeof products === 'string' ? JSON.parse(products) : products;
                                          return JSON.stringify(parsed, null, 2);
                                        } catch (e) {
                                          return String(videoDetails[video._id]?.user_metadata?.products || 'Invalid data');
                                        }
                                      })() as string}
                                    </pre>
                                  </div>
                                </>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ] : [])
                    ];
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}