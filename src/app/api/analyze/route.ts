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

- **timeline** – Timestamp when the product appears, in the format [start_time, end_time] (in seconds).
- **brand** – Name of the brand.
- **product_name** – Full name of the product.
- **location** – Provide product locations as percentages based on 1920×1080 video frame in the format [x%, y%, width%, height%]:
    - **x%, y%**: Top-left corner coordinates as percentages (0% = top-left of video)
    - **width%, height%**: Product bounding box dimensions as percentages

- **price** – The price of the product shown or mentioned, if available. If you cannot find price information directly from the video, use external search or your knowledge
- **description** – Summarize what is said or implied about the product in the video (e.g., via voiceover, subtitles, or customer testimonials).

⚠️ If multiple products appear in the same scene, list them separately with their own location coordinates.

**Respond with a valid JSON array only, no markdown formatting:**

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

