"""Compose smartphone frame around a screenshot (Galaxy S24 style).

Usage:
    python tools/compose_phone_frame.py screenshot.png output.png

Generates a clean Galaxy-style frame (rounded bezel + punch-hole camera).
Output PNG has transparent background outside the frame.
"""

from __future__ import annotations
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


def compose(src_path: str, out_path: str) -> None:
    screen = Image.open(src_path).convert("RGBA")
    sw, sh = screen.size

    # Scale up for crispness, then downscale at end.
    SS = 3  # supersample

    # Frame dimensions (in screen px units)
    BEZEL = 10            # uniform bezel
    PAD_X = BEZEL
    PAD_Y = BEZEL + 4     # slight extra top/bottom
    INNER_RADIUS = 38
    OUTER_RADIUS = 52
    CAMERA_R = 8

    fw = sw + PAD_X * 2
    fh = sh + PAD_Y * 2

    # Supersampled canvas
    W, H = fw * SS, fh * SS
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # 1) outer frame (dark, near-black)
    outer_color = (24, 24, 28, 255)
    draw.rounded_rectangle(
        (0, 0, W, H),
        radius=OUTER_RADIUS * SS,
        fill=outer_color,
    )

    # 1b) subtle highlight rim
    rim_color = (60, 60, 68, 255)
    rim_w = 1 * SS
    draw.rounded_rectangle(
        (rim_w, rim_w, W - rim_w, H - rim_w),
        radius=(OUTER_RADIUS - 1) * SS,
        outline=rim_color,
        width=rim_w,
    )

    # 2) inner screen area — paste screenshot, then mask to rounded rect
    inner_box = (PAD_X * SS, PAD_Y * SS, (PAD_X + sw) * SS, (PAD_Y + sh) * SS)

    # Build rounded mask for the screen
    mask = Image.new("L", (sw * SS, sh * SS), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle(
        (0, 0, sw * SS, sh * SS),
        radius=INNER_RADIUS * SS,
        fill=255,
    )

    # Resize screen to supersample
    screen_up = screen.resize((sw * SS, sh * SS), Image.LANCZOS)
    canvas.paste(screen_up, (inner_box[0], inner_box[1]), mask)

    # 3) punch-hole camera at top center
    cam_cx = W // 2
    cam_cy = (PAD_Y * SS) + (CAMERA_R * SS) + 2 * SS
    cam_r = CAMERA_R * SS
    draw.ellipse(
        (cam_cx - cam_r, cam_cy - cam_r, cam_cx + cam_r, cam_cy + cam_r),
        fill=(8, 8, 10, 255),
    )
    # tiny inner lens highlight
    inner_lens_r = cam_r - 2 * SS
    draw.ellipse(
        (cam_cx - inner_lens_r, cam_cy - inner_lens_r,
         cam_cx + inner_lens_r, cam_cy + inner_lens_r),
        outline=(40, 40, 50, 200),
        width=1 * SS,
    )

    # 4) downscale for smoothness
    out_w, out_h = fw, fh
    final = canvas.resize((out_w, out_h), Image.LANCZOS)

    final.save(out_path, "PNG")
    print(f"wrote {out_path} ({out_w}x{out_h})")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    src, out = sys.argv[1], sys.argv[2]
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    compose(src, out)
