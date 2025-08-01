import { NextResponse } from "next/server";

const API_KEY = process.env.TWELVELABS_API_KEY;
const TWELVELABS_API_BASE_URL = process.env.TWELVELABS_API_BASE_URL;

// Define a basic interface for the expected response data structure
interface VideoApiResponse {
  _id: string;
  index_id?: string;
  hls?: Record<string, unknown>; // Or a more specific HLS type if available
  system_metadata?: Record<string, unknown>; // Renamed from metadata to system_metadata
  user_metadata?: Record<string, unknown>; // Added for user metadata
  source?: Record<string, unknown>; // Or a more specific Source type
  embedding?: Record<string, unknown>; // Or a more specific Embedding type
}

// Define types for TwelveLabs API response
interface TwelveLabsVideoData {
  _id?: string;
  index_id?: string;
  hls?: Record<string, unknown>;
  system_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  source?: Record<string, unknown>;
  embedding?: {
    video_embedding?: {
      segments?: Array<{
        start_offset_sec?: number;
        end_offset_sec?: number;
        embedding_option?: string;
        embedding_scope?: string;
        float?: number[];
      }>;
    };
  };
  [key: string]: unknown; // Allow for additional properties
}

// Type guard to check if the video object is valid and has expected properties
function isValidVideoData(data: unknown): data is TwelveLabsVideoData {
  return typeof data === 'object' && data !== null;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ videoId: string }> }
) {
  const params = await context.params;
  const videoId = params.videoId;

  // Get other params from search params
  const { searchParams } = new URL(req.url);
  const indexId = searchParams.get("indexId");
  const requestEmbeddings = searchParams.get("embed") === 'true';

  if (!indexId) {
    return NextResponse.json(
      { error: "indexId is required" },
      { status: 400 }
    );
  }

  if (!videoId) {
    return NextResponse.json(
      { error: "videoId is required" },
      { status: 400 }
    );
  }

  if (!API_KEY || !TWELVELABS_API_BASE_URL) {
    return NextResponse.json(
      { error: "API credentials not configured" },
      { status: 500 }
    );
  }

  // Base URL
  let url = `${TWELVELABS_API_BASE_URL}/indexes/${indexId}/videos/${videoId}`;

  // Always include embedding query parameters if requested
  if (requestEmbeddings) {
    // Include only supported embedding options
    url += `?embedding_option=visual-text&embedding_option=audio`;
  }

  const options = {
    method: "GET",
    headers: {
      "x-api-key": `${API_KEY}`,
      "Accept": "application/json"
    },
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API error: ${response.status} ${response.statusText}`);
      console.error(`❌ Error details: ${errorText}`);

      // If video is not found, provide a more helpful error message
      if (response.status === 404) {
        console.error(`❌ Video ${videoId} not found in index ${indexId}. It might still be processing.`);
      }

      return NextResponse.json(
        { error: `Failed to fetch video data: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    // Use unknown type and a type guard for safer handling
    const videoData: unknown = await response.json();

    if (requestEmbeddings) {

      const typedVideoData = videoData as TwelveLabsVideoData;
      if (typedVideoData.embedding) {
      } else {
        console.warn(`⚠️ No embedding data found in response for video ${videoId}`);
      }
    }

    // Validate the received data structure
    if (!isValidVideoData(videoData)) {
      throw new Error("Invalid video data structure received.");
    }

    // Deep clone videoData to avoid mutating the original
    const responseData: VideoApiResponse = {
      _id: videoId,
      index_id: indexId,
    };

    const typedVideoData: TwelveLabsVideoData = videoData;

    // Copy over original fields directly to preserve the structure
    if (typedVideoData.hls) {
      responseData.hls = typedVideoData.hls;
    }

    if (typedVideoData.system_metadata) {
      // Preserve the original system_metadata structure
      responseData.system_metadata = typedVideoData.system_metadata;
    }

    if (typedVideoData.user_metadata) {
      responseData.user_metadata = typedVideoData.user_metadata;
    }

    if (typedVideoData.source) {
      responseData.source = typedVideoData.source;
    }

    // Check if the 'embedding' field exists in the response from TwelveLabs
    if (typedVideoData.embedding) {
      responseData.embedding = typedVideoData.embedding;
    } else if (requestEmbeddings) {
      console.warn(`⚠️ Embedding was requested but not found in API response!`);
    }

    return NextResponse.json(responseData);

  } catch (e) {
    console.error('❌ Error fetching video details:', e);
    return NextResponse.json(
      { error: `Failed to fetch or process video data: ${e instanceof Error ? e.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}