# PlantMap

Internal browser tool for **planting concept layouts**.

Inspired by EasyMap’s dark landing + lightweight studio workflow, scoped to planting only.

## Run locally

```bash
cd planting-concept
python3 -m http.server 8765
```

Then visit `http://localhost:8765`.

## Share on the Internet (GitHub Pages)

Repo workflow: `.github/workflows/deploy-plantmap.yml`

1. Merge this branch to `main` (or run the workflow on `main` after merge).
2. GitHub → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. After the **Deploy PlantMap** Action succeeds, the site is public at:

`https://woheshiwen.github.io/US-Stock/`

Studio: `https://woheshiwen.github.io/US-Stock/studio.html`

Anyone with the link can try it in a browser (no account). Projects stay in **their own browser** `localStorage`.

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
