#!/usr/bin/env python3
"""Generate the three built-in sample photos for Vice Sunset Cover Studio.

Every image is drawn from scratch with PIL + numpy: smooth sky gradients,
a glowing sun, sea and street reflections, building and palm silhouettes.
No photo, artwork or font from any game is used, so the samples are free
to ship with the entry. Run from the repository root:

    python3 tools/generate-samples.py

Writes app/samples/sunset.jpg, app/samples/neon.jpg and
app/samples/palms.jpg (1200x900, JPEG quality 88).
"""

import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 1200, 900
OUT = Path(__file__).resolve().parent.parent / "app" / "samples"


def vgrad(stops):
    """Vertical gradient from a list of (position 0..1, (r, g, b)) stops."""
    ys = np.linspace(0, 1, H)[:, None]
    cols = np.zeros((H, 3), dtype=float)
    pos = np.array([s[0] for s in stops])
    rgb = np.array([s[1] for s in stops], dtype=float)
    for ch in range(3):
        cols[:, ch] = np.interp(ys[:, 0], pos, rgb[:, ch])
    img = np.repeat(cols[:, None, :], W, axis=1)
    return Image.fromarray(img.astype(np.uint8), "RGB")


def sun_glow(draw, cx, cy, r, core, halo):
    """Sun disc with a soft halo, drawn as concentric translucent circles."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i in range(24, 0, -1):
        rr = r * (1 + i * 0.22)
        a = int(10 + (24 - i) * 2)
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=halo + (a,))
    d.ellipse([cx - r, cy - r, cx + r, cy + rr], fill=core + (255,))
    return layer


def palm(draw, x, y, s, lean, dark, rng):
    """One palm silhouette: curved trunk plus seven drooping fronds."""
    top_x = x + lean * s
    top_y = y - s
    # trunk: a tapering curved quad
    pts = []
    for t in np.linspace(0, 1, 12):
        cx = x + lean * s * t * t
        cy = y - s * t
        wdt = max(2.0, s * 0.045 * (1 - t * 0.6))
        pts.append((cx - wdt, cy))
    for t in np.linspace(1, 0, 12):
        cx = x + lean * s * t * t
        cy = y - s * t
        wdt = max(2.0, s * 0.045 * (1 - t * 0.6))
        pts.append((cx + wdt, cy))
    draw.polygon(pts, fill=dark)
    # fronds: quadratic curves leaving the crown and drooping to a tip
    for k in range(7):
        a = math.radians(-165 + k * 27)  # fan across the top of the crown
        L = s * rng.uniform(0.5, 0.68)
        tip_x = top_x + math.cos(a) * L
        tip_y = top_y + math.sin(a) * L * 0.45 + s * 0.22
        mid_x = top_x + math.cos(a) * L * 0.5
        mid_y = top_y + math.sin(a) * L * 0.5 - s * 0.08
        pts = []
        for t in np.linspace(0, 1, 16):
            bx = (1 - t) ** 2 * top_x + 2 * (1 - t) * t * mid_x + t * t * tip_x
            by = (1 - t) ** 2 * top_y + 2 * (1 - t) * t * mid_y + t * t * tip_y
            pts.append((bx, by))
        draw.line(pts, fill=dark, width=max(3, int(s * 0.028)), joint="curve")


def birds(draw, n, y0, y1, dark, rng):
    for _ in range(n):
        x = rng.uniform(60, W - 60)
        y = rng.uniform(y0, y1)
        s = rng.uniform(10, 26)
        draw.arc([x - s, y - s * 0.5, x, y + s * 0.5], 200, 340, fill=dark, width=3)
        draw.arc([x, y - s * 0.5, x + s, y + s * 0.5], 200, 340, fill=dark, width=3)


def sunset():
    rng = random.Random(61)
    img = vgrad([(0.0, (255, 166, 66)), (0.35, (255, 94, 110)),
                 (0.62, (150, 48, 130)), (0.8, (52, 28, 84)), (1.0, (24, 14, 52))])
    img = img.convert("RGBA")
    img.alpha_composite(sun_glow(None, 600, 470, 95, (255, 224, 150), (255, 140, 90)))
    d = ImageDraw.Draw(img)
    # sea: dark band with warm reflection streaks under the sun
    d.rectangle([0, 560, W, H], fill=(26, 12, 58, 255))
    for _ in range(90):
        x = rng.uniform(380, 820)
        y = rng.uniform(570, 880)
        ln = rng.uniform(20, 130) * (1 - (y - 560) / 340)
        a = rng.randint(40, 170)
        d.line([x, y, x + ln, y], fill=(255, 150, 90, a), width=rng.randint(2, 5))
    # distant skyline: low blocks along the horizon
    skyline = [(0, 530), (90, 530), (90, 500), (150, 500), (150, 515), (230, 515),
               (230, 490), (300, 490), (300, 530), (420, 530), (420, 505), (480, 505),
               (480, 530), (760, 530), (760, 500), (830, 500), (830, 520), (920, 520),
               (920, 495), (990, 495), (990, 530), (1080, 530), (1080, 510),
               (1150, 510), (1150, 530), (1200, 530), (1200, 560), (0, 560)]
    d.polygon(skyline, fill=(30, 12, 58, 255))
    birds(d, 9, 120, 300, (30, 12, 58, 255), rng)
    # palms framing the scene
    palm(d, 90, 900, 330, 0.35, (16, 6, 34, 255), rng)
    palm(d, 1130, 900, 300, -0.4, (16, 6, 34, 255), rng)
    palm(d, 210, 900, 210, 0.25, (20, 8, 40, 255), rng)
    img = img.convert("RGB").filter(ImageFilter.GaussianBlur(0.4))
    return img


def neon():
    rng = random.Random(62)
    img = vgrad([(0.0, (8, 4, 26)), (0.5, (26, 10, 54)), (0.8, (54, 16, 74)), (1.0, (16, 6, 34))])
    img = img.convert("RGBA")
    d = ImageDraw.Draw(img)
    # stars
    for _ in range(120):
        x, y = rng.uniform(0, W), rng.uniform(0, 320)
        a = rng.randint(60, 220)
        d.ellipse([x, y, x + 2, y + 2], fill=(255, 255, 255, a))
    # moon
    d.ellipse([980, 70, 1080, 170], fill=(235, 240, 255, 255))
    d.ellipse([1000, 85, 1075, 160], fill=(200, 210, 245, 255))
    # buildings with lit windows, back row then front row
    for row, base_y, hmin, hmax in [(0, 700, 260, 480), (1, 760, 180, 380)]:
        x = -20
        while x < W + 20:
            bw = rng.uniform(90, 210)
            bh = rng.uniform(hmin, hmax)
            top = base_y - bh
            shade = (14 + row * 8, 8 + row * 5, 34 + row * 10, 255)
            d.rectangle([x, top, x + bw, base_y + 140], fill=shade)
            if rng.random() < 0.4:  # rooftop antenna
                d.line([x + bw / 2, top, x + bw / 2, top - 34], fill=shade, width=4)
                d.ellipse([x + bw / 2 - 4, top - 42, x + bw / 2 + 4, top - 34],
                          fill=(255, 60, 90, 255))
            for wy in np.arange(top + 18, base_y + 110, 26):
                for wx in np.arange(x + 12, x + bw - 12, 24):
                    if rng.random() < 0.42:
                        c = rng.choice([(255, 214, 130, 255), (120, 230, 255, 255),
                                        (255, 120, 170, 255), (255, 240, 200, 255)])
                        d.rectangle([wx, wy, wx + 12, wy + 16], fill=c)
            x += bw + rng.uniform(4, 26)
    # neon sign bars with glow
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for (x0, y0, x1, y1, col) in [
            (60, 640, 420, 668, (255, 45, 149)), (700, 600, 1140, 626, (0, 229, 255)),
            (180, 700, 560, 724, (0, 229, 255)), (820, 690, 1060, 712, (255, 45, 149))]:
        gd.rectangle([x0, y0, x1, y1], fill=col + (255,))
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    img.alpha_composite(glow)
    d = ImageDraw.Draw(img)
    for (x0, y0, x1, y1, col) in [
            (60, 640, 420, 668, (255, 45, 149)), (700, 600, 1140, 626, (0, 229, 255)),
            (180, 700, 560, 724, (0, 229, 255)), (820, 690, 1060, 712, (255, 45, 149))]:
        d.rectangle([x0, y0, x1, y1], fill=col + (255,))
    # wet street: dark floor with neon reflections
    d.rectangle([0, 780, W, H], fill=(10, 6, 26, 255))
    for _ in range(70):
        x = rng.uniform(0, W)
        y = rng.uniform(790, 890)
        ln = rng.uniform(30, 160)
        c = rng.choice([(255, 45, 149), (0, 229, 255), (255, 214, 130)])
        d.line([x, y, x + ln, y], fill=c + (rng.randint(40, 130),), width=rng.randint(2, 4))
    img = img.convert("RGB")
    return img


def palms():
    rng = random.Random(63)
    img = vgrad([(0.0, (64, 190, 200)), (0.35, (120, 200, 205)), (0.55, (255, 170, 140)),
                 (0.75, (255, 110, 130)), (1.0, (90, 30, 90))])
    img = img.convert("RGBA")
    img.alpha_composite(sun_glow(None, 600, 430, 80, (255, 236, 180), (255, 150, 110)))
    d = ImageDraw.Draw(img)
    # ocean strip on the horizon
    d.rectangle([0, 520, W, 600], fill=(30, 90, 130, 255))
    for _ in range(40):
        x = rng.uniform(0, W)
        y = rng.uniform(525, 595)
        d.line([x, y, x + rng.uniform(30, 120), y], fill=(255, 220, 180, 120), width=2)
    # road: dark trapezoid narrowing to the horizon
    d.polygon([(300, 900), (900, 900), (640, 600), (560, 600)], fill=(24, 16, 44, 255))
    # centre dashes shrinking with perspective
    for i in range(9):
        t = i / 9
        y = 620 + t * t * 260
        wdt = 3 + t * 10
        ln = 8 + t * 26
        d.rectangle([600 - wdt / 2, y, 600 + wdt / 2, y + ln], fill=(255, 220, 130, 255))
    # sand shoulders
    d.polygon([(0, 900), (300, 900), (560, 600), (0, 600)], fill=(214, 164, 110, 255))
    d.polygon([(900, 900), (1200, 900), (1200, 600), (640, 600)], fill=(214, 164, 110, 255))
    # palm rows receding along the road, leaning away from it
    for i, t in enumerate([0.0, 0.28, 0.5, 0.66, 0.78, 0.87, 0.93]):
        s = 240 * (1 - t) + 26
        y = 900 - t * 300
        xl = 300 - t * 300 + 60 * (1 - t)
        xr = 900 + t * 300 - 60 * (1 - t)
        palm(d, xl, y, s * 0.9, -0.25, (18, 10, 40, 255), rng)
        palm(d, xr, y, s, 0.25, (18, 10, 40, 255), rng)
    birds(d, 7, 100, 260, (30, 20, 60, 255), rng)
    img = img.convert("RGB").filter(ImageFilter.GaussianBlur(0.4))
    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, fn in [("sunset", sunset), ("neon", neon), ("palms", palms)]:
        img = fn()
        path = OUT / f"{name}.jpg"
        img.save(path, "JPEG", quality=88)
        print("wrote", path, img.size, path.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
