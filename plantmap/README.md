# PlantMap

Browser tool for **planting concept layouts** (internal / trial use).

EasyMap-inspired dark landing + lightweight studio. Original code, planting-scoped only.

## Try online (GitHub Pages)

After enabling Pages (**Settings → Pages → Source: GitHub Actions**):

- Landing: https://woheshiwen.github.io/plant.map/
- Studio: https://woheshiwen.github.io/plant.map/studio.html

> Note: repo name has a dot (`plant.map`). If Pages URL 404s, check the exact URL shown under Settings → Pages.

## Run locally

```bash
python3 -m http.server 8765
# open http://localhost:8765
```

## Features

- Upload site plan as base
- Draw zones: canopy, shrub, groundcover, lawn, edge/wetland, existing keep
- One-click rounded corners on selected zone (尖角 → 种植床圆角)
- Pan / zoom, concept notes
- Export PNG with legend
- Save / import JSON (`plantmap.project.v1`)
- EN / 中文, local-only storage
