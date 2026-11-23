"""Bakes the "frost" images used for glass panels (see .frost in assets/ui/style.css).

Each one is the wallpaper exactly as the screen shows it (crop + the screen's shade gradient), then
blurred and saturated the way backdrop-filter: blur(22px) saturate(...) would. Panels show this
copy, lined up with the photo, instead of blurring live, which the TV's GPU cannot do at 60 fps.

Run after changing a wallpaper or its shade:  python tools/make-frost.py
"""
from pathlib import Path

from PIL import Image, ImageFilter

IMG = Path(__file__).resolve().parent.parent / "assets" / "ui" / "img"
W, H = 1920, 1080
TINT = (2, 4, 10)


def cover(im, pos_y=0.5):
    """object-fit: cover into 1920x1080, object-position: 50% pos_y."""
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    x = (im.width - W) // 2
    y = round((im.height - H) * pos_y)
    return im.crop((x, y, x + W, y + H))


def shade(im, stops):
    """Vertical linear-gradient of TINT with alpha stops [(pos 0..1, alpha), ...] over the image."""
    over = Image.new("RGBA", (W, H))
    px = over.load()
    for y in range(H):
        t = y / (H - 1)
        for (p0, a0), (p1, a1) in zip(stops, stops[1:]):
            if p0 <= t <= p1:
                a = a0 + (a1 - a0) * ((t - p0) / (p1 - p0) if p1 > p0 else 0)
                break
        alpha = round(a * 255)
        for x in range(W):
            px[x, y] = TINT + (alpha,)
    return Image.alpha_composite(im.convert("RGBA"), over).convert("RGB")


def saturate(im, s):
    """CSS saturate(s): the Filter Effects matrix (not PIL's luma-based Color enhance)."""
    m = [
        0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
        0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
        0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ]
    return im.convert("RGB", matrix=m[0:3] + [0] + m[3:6] + [0] + m[6:9] + [0])


def frost(src, out, stops, blur, sat, pos_y=0.5, fg=None):
    im = cover(Image.open(IMG / src).convert("RGB"), pos_y)
    if fg:  # foreground cut-out (same photo) drawn over the background, as on screen
        im = Image.alpha_composite(im.convert("RGBA"), Image.open(IMG / fg).convert("RGBA")).convert("RGB")
    im = shade(im, stops)
    im = im.filter(ImageFilter.GaussianBlur(blur))
    im = saturate(im, sat)
    im.resize((W // 2, H // 2), Image.LANCZOS).save(IMG / out, quality=84, optimize=True)
    print("wrote", out)


def glass(src, out, blur=16, bright=1.5, pos_y=0.5):
    """The pre-blurred, brightened photo the big glass clock shows through its digits."""
    from PIL import ImageEnhance
    im = cover(Image.open(IMG / src).convert("RGB"), pos_y).filter(ImageFilter.GaussianBlur(blur))
    ImageEnhance.Brightness(im).enhance(bright).resize((W // 2, H // 2), Image.LANCZOS).save(IMG / out, quality=84, optimize=True)
    print("wrote", out)


HOME_SHADE = [(0, .32), (.22, 0), (.70, 0), (1, .38)]   # #home .shade
AMB_SHADE = [(0, .5), (.30, 0), (.55, 0), (1, .66)]     # #ambient .shade

# Home scenes (behind .dock: blur 22, saturate 180%); their glass images come from tvOS Launcher.
for n in ("night", "dawn", "fog", "golden"):
    frost("scene-%s.jpg" % n, "scene-%s-frost.jpg" % n, HOME_SHADE, blur=22, sat=1.8, fg="scene-%s-fg.webp" % n)
# Screensaver photos (behind .chip: blur 22, saturate 170%), positions as in app.js F1.
for n, pos in (("suzuka", .4), ("alonso", .5), ("verstappen", 0.0), ("bottas", .6)):
    frost("f1-%s.jpg" % n, "f1-%s-frost.jpg" % n, AMB_SHADE, blur=22, sat=1.7, pos_y=pos)
    if n != "suzuka":
        glass("f1-%s.jpg" % n, "f1-%s-glass.jpg" % n, pos_y=pos)
