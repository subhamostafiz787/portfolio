# The Brew: portfolio site

Plain HTML, CSS and JS. No build step and no dependencies.

```
index.html   home: hero, the brew story, "See the work" link, contact
work.html    the work page: project cards
notebookcrm.html  case study page: prototype link + embedded PDF (files in projects/notebookcrm/)
styles.css   all styles for both pages (palette tokens are at the top)
main.js      both pages: scroll-drawn line, page transition, nav, order counter, cursor
.nojekyll    tells GitHub Pages to serve files as-is
```

## Put it on GitHub Pages

1. Create a repo named `<your-username>.github.io` (your site will live at `https://<your-username>.github.io`), or any name (it will live at `https://<your-username>.github.io/<repo>`).
2. Upload these four files to the repo root (drag and drop on github.com works).
3. Repo → Settings → Pages → Source: "Deploy from a branch", Branch: `main`, folder `/ (root)` → Save.
4. Wait about a minute and open the URL.

## Fill in your details

Search `index.html` for `[` to find every placeholder: `[Your name]`, `[YN]`, `[School]`, `[City]`, `[your email]`, and the project cards.

## Edit the story drawing

The whole line lives in one SVG (`id="line"`) in `index.html`.
- `data-main` paths are drawn in order as one continuous stroke.
- `data-detail` paths sketch themselves in as the pen passes them.
- `data-note` text (the handwritten notes) fades in as the pen arrives.
- Chapter colors and positions are the `CH` list at the top of `main.js`.

## Preview locally

Open `index.html` in a browser, or run `python3 -m http.server` in this folder and visit http://localhost:8000.
