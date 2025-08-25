import { NextResponse } from 'next/server';

const API_KEY = process.env.TWELVELABS_API_KEY;
const TWELVELABS_API_BASE_URL = process.env.TWELVELABS_API_BASE_URL;

export const maxDuration = 60;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get("videoId");
    const forceReanalyze = searchParams.get("forceReanalyze") === "true";

    const prompt = `
    List all the products shown in the video with the following details:

- timeline: [start_time, end_time] in seconds
- brand: brand name
- product_name: full product name
- location: [x%, y%, width%, height%] — percentage values relative to a 16:9 aspect ratio video player
- price: price if shown or mentioned. If you cannot find price information directly from the video, use external search or your knowledge
- description: describe what is said or shown about the product

⚠️ If multiple products appear in the same scene, list them separately with their own location coordinates.

Respond with a valid JSON array only, no markdown formatting:

[
  {
    "timeline": [start, end],
    "brand": "brand_name",
    "product_name": "product_name",
    "location": [x%, y%, width%, height%],
    "price": "price_info",
    "description": "product_description"
  }
]
`

    if (!videoId) {
      console.error('❌ Video ID is required');
      return NextResponse.json(
        { error: "videoId is required" },
        { status: 400 }
      );
    }

    if (!API_KEY || !TWELVELABS_API_BASE_URL) {
      console.error('❌ Missing API key or base URL in environment variables');
      return NextResponse.json(
        { error: "Missing API key or base URL in environment variables" },
        { status: 500 }
      );
    }

    const url = `${TWELVELABS_API_BASE_URL}/analyze`;

    const requestBody = {
        prompt: prompt,
        video_id: videoId,
        stream: false
    };

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": API_KEY,
        },
        body: JSON.stringify(requestBody)
    };

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ TwelveLabs API error (${response.status}): ${errorText}`);

        // Return the actual error from the API
        return NextResponse.json(
          { error: `TwelveLabs API error (${response.status}): ${errorText}` },
          { status: response.status }
        );
      }

      const responseText = await response.text();

      if (!responseText) {
        throw new Error("Empty response from API");
      }

      const data = JSON.parse(responseText);

      // Return the complete data object instead of just data.data
      return NextResponse.json(data, { status: 200 });
    } catch (error) {
      console.error("❌ Error in GET function:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal Server Error" },
        { status: 500 }
      );
    }
}

