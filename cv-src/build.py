"""CV Eli Potapenko — два варианта в одном стиле (по исходному дизайнерскому CV): Product designer и Frontend (JavaScript).
Шаблон — HTML (сетка, цвета и размеры сняты с оригинала: 600×774 pt, колонки x=24/346, текст 12 pt, шаг 17 pt),
шрифты — свободные (OFL): Archivo Expanded для заголовков, Montserrat для текста. PDF печатает Chromium (Playwright).

    python3 cv-src/build.py      → public/cv/*.pdf
"""
from __future__ import annotations

import html
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "public" / "cv"

DESIGNER = {
    "file": "eli-potapenko-product-designer-cv.pdf",
    "title": "Eli Potapenko — Product Designer CV",
    "role": "Product designer",
    "link": ("dribbble.com/el_ip", "https://dribbble.com/el_ip"),
    "intro_head": "7+ years of",
    "intro": "Transforming user needs and business<br>objectives into innovative and<br>engaging digital experiences.",
    "left": [
        ("Skills", ["Product Design", "Corporate Website", "Online Store", "UI Library", "Prototype", "User Flows",
                    "Landing Page", "Mobile App UI", "Web Business Card"]),
        ("Experience", ["GRAVITAD: Jan 2024 - Dec 2025", "KANDA SOFTWARE: Jan 2023 - Sep 2024", "ROYC GROUP: Mar 2023 - Nov 2023",
                        "SPHEROID UNIVERSE: Mar 2019 - Oct 2022", "FOURMETA: Feb 2020 - Apr 2021", "INFOMIR: Oct 2018 - Jun 2022",
                        "SPONGE D&D: Jan 2018 - Apr 2019"]),
        ("Certificates", ["Essential Skills in Adobe Illustrator 2025|Professional Certificate",
                          "Career Essentials in Generative AI by|Microsoft and LinkedIn"]),
    ],
    "right": [
        ("Software", ["Figma", "Sketch", "Miro", "Adobe Photoshop", "Adobe Illustrator", "Adobe After Effects", "Adobe XD",
                      "Cinema4D", "Blender"]),
        ("Languages", ["English", "Polish", "Portuguese", "Ukrainian", "Russian", "German"]),
        ("Contact", ["elocate.netlify.app>https://elocate.netlify.app"]),
    ],
}

FRONTEND = {
    "file": "eli-potapenko-frontend-cv.pdf",
    "title": "Eli Potapenko — Frontend / Fullstack Developer (JavaScript) CV",
    "role": "Frontend / Fullstack developer · JavaScript",
    "link": ("elocate.netlify.app", "https://elocate.netlify.app"),
    "intro_head": "Design → code",
    "intro": "7+ years designing products — now building<br>them end to end: React front-ends, Node.js<br>and Python back-ends, from Figma to prod.",
    "left": [
        ("Skills", ["JavaScript (ES2022+) · TypeScript", "React · component architecture", "HTML5 · CSS3 · design tokens",
                    "Responsive & accessible UI", "WebGL · Three.js · GLSL shaders", "Node.js · REST APIs · SSE",
                    "Python back-ends · SQLite", "Performance: 60 fps on low-end GPUs", "End-to-end tests (Playwright)"]),
        ("Projects", ["Yggdrasill Cafe — multi-agent dashboard|JS front-end · Python back-end · SSE live feed",
                      "Visual Voice — real-time voice visualizer|WebGL2 shaders · Web Audio API · 60 fps",
                      "Elocate studio — studio website|Three.js crystal · Netlify Forms · Playwright"]),
        ("Experience", ["Product designer, 7+ years:|GRAVITAD · KANDA SOFTWARE · ROYC GROUP|SPHEROID UNIVERSE · INFOMIR · FOURMETA"]),
    ],
    "right": [
        ("Stack", ["JavaScript · TypeScript", "React · Vite", "Three.js · WebGL2", "Node.js", "Python", "SQLite",
                   "Git · GitHub", "Netlify · Playwright", "Figma"]),
        ("Languages", ["English", "Polish", "Portuguese", "Ukrainian", "Russian", "German"]),
        ("Contact", ["elocate.netlify.app>https://elocate.netlify.app",
                     "dribbble.com/el_ip>https://dribbble.com/el_ip"]),
    ],
}

CSS = """
@font-face { font-family: 'Archivo'; src: url('fonts/Archivo.ttf'); font-weight: 100 900; font-stretch: 62% 125%; }
@font-face { font-family: 'Montserrat'; src: url('fonts/Montserrat.ttf'); font-weight: 100 900; }
@page { size: 600pt 774pt; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 600pt; height: 774pt; background: #fff; overflow: hidden; }
body { position: relative; font-family: 'Montserrat'; font-size: 12pt; line-height: 17pt; color: #828282; }
.grad { position: absolute; left: 451pt; top: 565pt; width: 508pt; height: 281pt; }
.h { font-family: 'Archivo'; font-stretch: 125%; font-weight: 800; text-transform: uppercase; color: #262626; letter-spacing: 0.01em; }
.name { position: absolute; left: 24pt; top: 40pt; font-size: 12pt; line-height: 14pt; }
.role { position: absolute; left: 24pt; top: 74pt; }
.big { position: absolute; left: 24pt; top: 118pt; font-family: 'Archivo'; font-stretch: 125%; font-weight: 800; font-size: 32pt;
       line-height: 40pt; color: #22B260; text-decoration: underline; text-decoration-thickness: 2.4pt; text-underline-offset: 4pt; }
.intro-h { position: absolute; left: 24pt; top: 192pt; }
.intro { position: absolute; left: 24pt; top: 211pt; line-height: 15pt; }
.sec { position: absolute; width: 300pt; }
.l .sec { left: 24pt; } .r .sec { left: 346pt; width: 240pt; }
.sec[data-i='0'] { top: 287pt; } .sec[data-i='1'] { top: 488pt; } .sec[data-i='2'] { top: 655pt; }   /* высоты заголовков — как в оригинале */
.sec .h { margin-bottom: 3pt; }
.item { display: block; color: #828282; text-decoration: none; }
.item .sub { display: block; }
.sec.tight .item { margin-bottom: 4pt; }
a.item { color: #828282; }
"""


def items(rows: list[str]) -> str:
    out = []
    for r in rows:
        if ">" in r:                                        # «текст>ссылка»
            t, href = r.split(">", 1)
            out.append(f'<a class="item" href="{html.escape(href)}">{html.escape(t)}</a>')
        else:
            parts = [html.escape(x) for x in r.split("|")]  # «строка|продолжение» — в одну позицию списка
            out.append('<span class="item">' + "".join(f'<span class="sub">{p}</span>' for p in parts) + "</span>")
    return "".join(out)


def column(secs) -> str:
    out = []
    for i, (head, rows) in enumerate(secs):
        tight = " tight" if any("|" in r for r in rows) else ""
        out.append(f'<div class="sec{tight}" data-i="{i}"><div class="h">{html.escape(head)}</div>{items(rows)}</div>')
    return "".join(out)


def page(cv: dict) -> str:
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{html.escape(cv['title'])}</title><style>{CSS}</style></head><body>
<img class="grad" src="gradient.png" alt="">
<div class="h name">Eli<br>Potapenko</div>
<div class="role">{html.escape(cv['role'])}</div>
<a class="big" href="{cv['link'][1]}">{html.escape(cv['link'][0])}</a>
<div class="h intro-h">{html.escape(cv['intro_head'])}</div>
<div class="intro">{cv['intro']}</div>
<div class="col l">{column(cv['left'])}</div>
<div class="col r">{column(cv['right'])}</div>
</body></html>"""


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = []
    for cv in (DESIGNER, FRONTEND):
        src = HERE / (Path(cv["file"]).stem + ".html")
        src.write_text(page(cv), encoding="utf-8")
        jobs.append({"html": str(src), "pdf": str(OUT / cv["file"]), "png": str(HERE / (Path(cv["file"]).stem + ".png"))})
    runner = HERE / "_print.mjs"
    runner.write_text("""
import { chromium } from 'playwright';
const jobs = JSON.parse(process.argv[2]);
const b = await chromium.launch();
for (const j of jobs) {
  const p = await b.newPage({ viewport: { width: 800, height: 1032 }, deviceScaleFactor: 1.5 });
  await p.goto('file://' + j.html); await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: j.pdf, width: '8.3333in', height: '10.75in', printBackground: true, pageRanges: '1' });
  await p.screenshot({ path: j.png });
  console.log('✓', j.pdf.split('/').pop());
}
await b.close();
""", encoding="utf-8")
    subprocess.run(["node", str(runner), json.dumps(jobs)], cwd=HERE.parent, check=True)
    runner.unlink()


if __name__ == "__main__":
    main()
