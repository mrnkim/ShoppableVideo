# Shoppable Video – AI-Powered In-Video Commerce Demo

A sample web application that turns any streaming video into an interactive, “shop-the-look” experience.  
Built on **TwelveLabs’ video understanding APIs**, the app detects products that appear in specific frames, generates contextual descriptions, recommends similar styles, and lets viewers check-out without pausing playback – mirroring TikTok Shop’s contextual commerce flow but optimized for long-form streaming content.

## ✨ Key Capabilities
| Capability | API(s) Used | Description |
|------------|-------------|-------------|
| **Frame-accurate product discovery** | Search API | Natural-language queries such as “red dress in the dance scene” pinpoint products with <2 s latency. |
| **Contextual product copy** | Analyze API | Generates scene-aware descriptions (e.g. “Wind-proof jacket worn on mountain summit”). |
| **Similar styles / bundles** | Embed API | Finds visually & textually similar items for “Shop the Look.” |
| **Dynamic overlays & mini-cart** | — | Non-intrusive React components that keep playback smooth and persist the cart in `localStorage`. |

## 🖼️ UI Walkthrough
1. **Product Markers** – Animated icons appear only when a product is on-screen.  
2. **Context Sidebar** – Expands on click to show AI-generated details and “Why Suggested?” blurbs.  
3. **Mini Cart** – Sticks to the side, updates in real-time, survives page refresh.  
4. **Checkout Flow** – Stubbed in this demo; replace with Stripe / Shopify, etc.

![App screenshot](docs/screenshot.png) <!-- optional -->

## ⚙️ Tech Stack
- **Next.js 14 / React 18** – App Router, API routes (Edge-ready).
- **TypeScript** – End-to-end types incl. TwelveLabs models.
- **Tailwind CSS 3 + MUI** – Rapid UI styling & accessible components.
- **twelvelabs-js** – Thin wrapper for Search / Analyze / Embed endpoints.
- **React-Player** – Lightweight HTML5/HLS player with custom controls.
- **localStorage** – Session-persistent cart.

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/your-org/ShoppableVideo.git
cd ShoppableVideo
npm install

# 2. Configure environment
cp .env.example .env.local
# → Fill TWELVELABS_API_KEY and (optionally) default INDEX / VIDEO IDs

# 3. Run dev server
npm run dev
open http://localhost:3000
```

### Available Scripts
| Command | Purpose |
|---------|---------|
| `npm run dev` | Hot-reload dev server on `localhost:3000`. |
| `npm run build` | Production build (Next.js & Tailwind). |
| `npm start` | Start built app (uses **`NODE_ENV=production`**). |
| `npm run lint` | ESLint + Next rules. |

## 🏗️ Project Structure
```
ShoppableVideo/
├── src/
│   ├── app/               # Next JS (app-router) pages & layouts
│   ├── components/        # ProductVideoPlayer, Sidebar, Cart
│   ├── contexts/          # CartContext, TwelveLabsContext
│   ├── lib/               # twelvelabs.ts SDK wrapper, cartStorage
│   └── styles/            # Tailwind base
├── public/                # Static assets / placeholder images
├── .env.example           # Required env variables
├── tailwind.config.js
└── README.md
```

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TWELVELABS_API_KEY` | ✅ | **Server-side** key for calling Search / Analyze / Embed. |
| `NEXT_PUBLIC_TWELVELABS_API_KEY` | ✅ | **Browser-side** calls (e.g. via fetch in edge functions). |
| `NEXT_PUBLIC_TWELVELABS_API_URL` | ❌ | Defaults to `https://api.twelvelabs.io/v1.2`. |
| `NEXT_PUBLIC_DEFAULT_INDEX_ID` | ❌ | Auto-loads this index on first visit. |
| `NEXT_PUBLIC_DEMO_VIDEO_ID` | ❌ | Demo fallback if no index/video selected. |

> Keep private keys server-side; don’t expose sensitive scopes in `NEXT_PUBLIC_*`.

## ⚡ Performance Notes
- **Overlay Latency < 2 s**: markers are driven by a debounced `progressInterval=100 ms` and pre-fetched detection data.
- **Pagination & Infinite Scroll**: Search & Embed requests use `page_limit` with lazy loading.
- **Edge-friendly**: API routes set `export const maxDuration` to avoid Vercel cold-start limits.

## 🛠️ Extending
1. **Checkout Integration** – Replace the stub in `ShoppingCart.tsx` with Stripe Checkout / Shopify Buy SDK.  
2. **Multi-video Playlist** – Store multiple video IDs, swap `currentVideo` in context.  
3. **Analytics** – Hook into cart events & overlay clicks for funnel tracking.  
4. **Content Security** – Use signed URLs / DRM with HLS.

## 🤝 Contributing
PRs are welcome! Please open an issue first to discuss major changes.

## 📄 License
MIT © 2025 San Francisco AI Factory  

> This repository is a demo. Refer to [factory.ai](https://www.factory.ai) & [TwelveLabs](https://www.twelvelabs.io) for production-grade offerings.
