# Mapping the Michelin Sky

A scrollytelling data story about who earns a Michelin star, and who is never even in the running.
As you scroll, the text moves past a pinned chart and each step animates the chart to the next point in the story.

CSE 478 · Ashley Yang, Caleb Burbank, Iris Lai, Michael Zavlunov, Shanali Islam

## Run it locally

You need a local web server, because browsers block loading the CSV when you open `index.html` directly from disk.

1. Clone the repo and go into the folder:

   ```sh
   git clone https://github.com/ayang46/michelin-sky.git
   cd michelin-sky
   ```

2. Start a server from the repo root (any static server works; Python 3 is the quickest):

   ```sh
   python3 -m http.server 8000
   ```

   Or, with Node installed: `npx serve .`

3. Open http://localhost:8000 and scroll.

You don't need to install or build anything. D3 v7, topojson-client and the world map shapes load from a CDN, so you need an internet connection.

**If the page loads but the charts are empty:** you are probably viewing it as `file://`. Use the server URL instead. Errors show in the browser console.

## The story

| Chapter | Question | Chart | What scrolling does |
|---|---|---|---|
| Hero | What is this about? | Headline numbers | Counts up: restaurants, stars, countries, and **0 in Africa** |
| 1 · What a star means | How rare is a star? | **Waffle**, 1,000 squares (1 square ≈ 8 restaurants) | Lights up 3★, then 2★, then 1★, then Bib Gourmand. Three stars are about 2 in every 100 restaurants |
| 2 · How a star is given | Where does each restaurant end up? | **Tree** with weighted branches (thicker = more restaurants) | Grows one level per step: the Guide, starred or not, star level, then the top 3 countries. Click a star level to fold its branches |
| 3 · Where the stars are | Which cuisines travel the world? | **Constellation map** (Equal Earth projection) | One map redraws for Japanese, French, Chinese and Italian. Points are countries (size = starred restaurants of that cuisine), and lines join nearest neighbours (a minimum spanning tree). Hover a point for its top restaurants; the cuisine buttons work too |
| 4 · What a star costs | Do stars follow price? | **Sankey**, price ($–$$$$) → award | Bands flow in one award at a time. Almost every star comes from $$$ or $$$$; cheap restaurants get a Bib Gourmand instead. Hover a band for its count |
| 5 · Who is left out | Where are the stars on Earth? | **Circle packing**, region → country (area = stars) | Europe grows in first (about 2 of every 3 stars), then the rest of the world, then France alone, then a dashed empty circle for Africa. Hover a circle for its top restaurants |
| End · But is that enough? | Can a prize most of the world can't win say where the best food is? | Reader poll | The reader picks an answer and gets a reply. The vote is saved only in their own browser |

Every number in the headlines and step text is computed from the CSV when the page loads, so it stays correct if the data changes.

## Data

`dataset/michelin_my_maps_cleaned.csv`: 7,709 restaurants from the Kaggle "Michelin Guide Restaurants" (michelin-my-maps) dataset.

How `script.js` cleans it (see `parseRow`):

- **Country** is the last part of `Location`. **City** is the first part. Dubai and Abu Dhabi are grouped as UAE.
- **Stars**: `3 Stars` → 3, `2 Stars` → 2, `1 Star` → 1, `Bib Gourmand` → 0 (recommended, no star).
- **Price group** is the number of currency symbols (`$`, `€`, `¥`, `฿`), from 1 to 4.
- **Cuisine** is the first tag in `Cuisine`. Regex lists in `FAMILY` sort it into Japanese, French, Chinese or Italian.
- **Region**: countries are grouped into UN regions (`REGION_OF`). Any country not listed counts as Europe.

The map shapes are Natural Earth, loaded from [world-atlas](https://github.com/topojson/world-atlas).

## Files

| File | What's in it |
|---|---|
| `index.html` | All story text: one `<section class="chapter">` per chapter, each with a `.scrolly` block (a sticky `<figure>` plus `.step` cards) |
| `style.css` | Design tokens (`:root` colors), the layout with the sticky chart, the mobile layout (below 820px wide) and the reveal animations |
| `script.js` | Data cleaning, the scroll engine, and one `draw*` function per chart |

## How the scrollytelling works (for developers)

- `scrolly(sectionId, onStep)` in `script.js` watches every `.step` in a section with an `IntersectionObserver`. When a step crosses the middle of the screen, it gets the `active` class and `onStep(stepIndex, element)` is called.
- Each `draw*` function builds its chart once, then registers an `onStep` that changes the chart with D3 transitions (colour, radius, stroke-dashoffset, clip-path width). Scrolling back up plays the steps in reverse.
- **To add a step:** add a `<div class="step" data-step="N">` in `index.html`, then handle `N` in that chart's `scrolly(...)` callback.
- **Step text with numbers:** put `<b data-fill="key">` in the HTML and call `fill("key", value)` in JS, or give the element an `id` and set its `innerHTML` from the data.
- Colors live in two places: CSS variables in `style.css` and the `C` object in `script.js`. Keep them in sync.
- Animations turn off when the reader has `prefers-reduced-motion` set (`DUR = 0`).
