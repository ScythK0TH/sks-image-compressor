# SKS Image Compressor

Full-stack image compression and conversion tool built with:
- **Frontend:** Vite + React + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + Sharp

## Features
- Drag-and-drop or browse to upload images.
- Target file size and quality controls (binary-search on quality where supported).
- Resize with custom dimensions and optional aspect-ratio lock.
- Format conversion across JPEG, PNG, WebP, GIF, AVIF, TIFF, and passthrough SVG.
- Metadata stripping (EXIF and other fields).
- Preset profiles (size saver, quality focus, balanced, thumbnail, web optimized, archive) and easy extensibility.

## Getting Started
```bash
# 1) Backend
cd server
npm install
npm run dev        # starts on http://localhost:4000

# 2) Frontend (separate terminal)
cd ../client
npm install
npm run dev        # starts on http://localhost:5173
```

Set `VITE_API_URL` in `client/.env` if the API is hosted elsewhere:
```
VITE_API_URL=http://localhost:4000
```

Build commands:
```bash
cd server && npm run build     # tsc compile
cd client && npm run build     # tsc + vite build
```

## Presets
Backend presets live in `server/src/presets.ts`. Add or tweak options there; the UI consumes them dynamically from `/api/presets`.

## Notes
- Sharp cannot encode SVG; SVG inputs are accepted but re-encoded in another selected format or passed through if kept as SVG.
- Upload limit defaults to 25 MB; adjust in `server/src/index.ts` (multer limits).

## License
Copyright ScythK0TH.
