import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.TWELVELABS_API_KEY;
const TWELVELABS_API_BASE_URL = process.env.TWELVELABS_API_BASE_URL;

// Type definition for metadata request
interface MetadataUpdateRequest {
  videoId: string;
  indexId: string;
  metadata: {
    products?: any[];
    analyzed_at?: string;
    source?: string;
    sector?: string;
    emotions?: string;
    brands?: string;
    locations?: string;
    demographics?: string;
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('💾 SaveMetadata API called');

    // Parse request body
    const body: MetadataUpdateRequest = await request.json();
    const { videoId, indexId, metadata } = body;

    console.log('📋 Request body:', { videoId, indexId, metadata });

    // Validate required parameters
    if (!videoId || !indexId) {
      console.error('❌ Missing required parameters:', { videoId, indexId });
      return NextResponse.json(
        { error: 'Video ID and Index ID are required' },
        { status: 400 }
      );
    }

    // Development/test environment response
    if (!API_KEY || !TWELVELABS_API_BASE_URL) {
      console.error('❌ Missing API key or base URL in environment variables');
      console.log('🔧 Returning development mode response');
      return NextResponse.json({
        success: true,
        message: 'Metadata updated successfully (development mode)'
      });
    }

    // Prepare API request
    const url = `${TWELVELABS_API_BASE_URL}/indexes/${indexId}/videos/${videoId}`;
    console.log('🌐 TwelveLabs API URL:', url);

    // Convert metadata to individual user_metadata fields
    const userMetadata: Record<string, string | number | boolean> = {};

    // Store products as JSON string
    if (metadata.products) {
      userMetadata.products = JSON.stringify(metadata.products);
    }

    // Store analyzed_at as string
    if (metadata.analyzed_at) {
      userMetadata.analyzed_at = metadata.analyzed_at;
    }

    const requestBody = {
      user_metadata: userMetadata
    };
    console.log('📤 Request body for TwelveLabs API:', requestBody);

    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify(requestBody)
    };

    console.log('📡 Calling TwelveLabs API...');
    // Call Twelve Labs API
    const response = await fetch(url, options);
    console.log('📡 TwelveLabs API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ TwelveLabs API error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to update metadata: ${response.statusText} - ${errorText}` },
        { status: response.status }
      );
    }

    // For 204 No Content response, don't try to parse JSON
    if (response.status === 204) {
      console.log('✅ TwelveLabs API: Video metadata updated successfully (204 No Content)');
      return NextResponse.json({
        success: true,
        message: 'Video metadata updated successfully'
      });
    }

    // For other success responses, try to parse JSON
    try {
      const responseData = await response.json();
      console.log('✅ TwelveLabs API response:', responseData);
      return NextResponse.json({
        success: true,
        message: 'Video metadata updated successfully',
        data: responseData
      });
    } catch (parseError) {
      console.log('✅ TwelveLabs API: Video metadata updated successfully (no response body)');
      return NextResponse.json({
        success: true,
        message: 'Video metadata updated successfully'
      });
    }
  } catch (error) {
    console.error('❌ Error updating video metadata:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}