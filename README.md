# SKS Image Compressor

Full-stack image compression and conversion tool built with **Next.js**, **TypeScript**, and **Tailwind CSS**.

## Features
- Drag-and-drop or browse to upload images
- Target file size and quality controls (binary-search on quality where supported)
- Resize with custom dimensions and optional aspect-ratio lock
- Format conversion across JPEG, PNG, WebP, GIF, AVIF, TIFF, and passthrough SVG
- Metadata stripping (EXIF and other fields)
- Preset profiles (size saver, quality focus, balanced, thumbnail, web optimized, archive) and easy extensibility

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Project Structure

```
├── app/
│   ├── api/           # API routes
│   │   ├── presets/   # GET /api/presets
│   │   └── process/   # POST /api/process
│   ├── globals.css    # Global styles
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Home page
├── lib/               # Shared utilities
│   ├── types.ts       # TypeScript types
│   ├── imageProcessor.ts  # Image processing logic
│   └── presets.ts     # Preset definitions
└── package.json
```

## Presets

Presets are defined in `lib/presets.ts`. Add or modify presets there; the UI consumes them dynamically from `/api/presets`.

## Notes
- Sharp cannot encode SVG; SVG inputs are accepted but re-encoded in another selected format or passed through if kept as SVG
- Upload limit defaults to 25 MB; adjust in `next.config.ts` (bodySizeLimit)
- All API routes are server-side and handle image processing efficiently

## License
Copyright © ScythK0TH
