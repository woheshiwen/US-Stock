# PlantMap

Internal browser tool for **planting concept layouts**.

Inspired by EasyMap’s dark landing + lightweight studio workflow, scoped to planting only.

## Run

Open locally:

```bash
cd planting-concept
python3 -m http.server 8765
```

Then visit `http://localhost:8765`.

Or just open `index.html` / `studio.html` in a browser (image export works either way).

## Pages

| File | Role |
|------|------|
| `index.html` | EasyMap-style dark landing (EN/ZH) |
| `studio.html` | Planting concept studio |

## Studio features

- Upload site plan / CAD screenshot as base
- Draw polygon zones for 6 planting layers: canopy, shrub, groundcover, lawn, edge/wetland, existing keep
- Pan / zoom, select & delete zones
- Concept note + project name
- Export PNG board with legend
- Save / import JSON (`plantmap.project.v1`)
- Local-only storage (`localStorage`)
