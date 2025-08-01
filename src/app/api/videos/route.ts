import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.TWELVELABS_API_KEY;
const TWELVELABS_API_BASE_URL = process.env.TWELVELABS_API_BASE_URL;

// Twelve Labs API 응답 타입 정의
type TwelveLabsVideoItem = {
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
};

type TwelveLabsApiResponse = {
  data: TwelveLabsVideoItem[];
  page_info: {
    page: number;
    limit_per_page: number;
    total_page: number;
    total_results: number;
    total_duration: number;
  };
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page') || '1';
    const indexId = searchParams.get('index_id');
    let limit = parseInt(searchParams.get('limit') || '12', 10);

    if (!indexId) {
      return NextResponse.json({ error: 'Index ID is required' }, { status: 400 });
    }

    // Enforce maximum limit of 50 for Twelve Labs API
    if (limit > 50) {
      console.warn(`Requested limit ${limit} exceeds maximum allowed (50). Using limit=50 instead.`);
      limit = 50;
    }

    if (!API_KEY || !TWELVELABS_API_BASE_URL) {
      console.error('Missing API key or base URL in environment variables');
      return NextResponse.json(
        { error: 'API credentials not configured' },
        { status: 500 }
      );
    }

    const url = `${TWELVELABS_API_BASE_URL}/indexes/${indexId}/videos?page=${page}&page_limit=${limit}`;

    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      console.error(`API error: ${response.status} - ${await response.text()}`);
      return NextResponse.json(
        { error: `Failed to fetch videos: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json() as TwelveLabsApiResponse;

    // API 응답 그대로 반환 (이미 TwelveLabsApiResponse 타입에 맞게 수정함)
    const formattedData = {
      data: data.data,
      page_info: {
        page: parseInt(page),
        total_page: data.page_info.total_page,
        total_count: data.page_info.total_results
      }
    };

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error in videos API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}