#!/usr/bin/env python3
"""Review-only contact sheet with scene labels and optional composition guides. Not a deliverable."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

def main():
    folder = Path(sys.argv[1]).resolve()
    meta = json.loads((folder / 'stills.json').read_text())
    guides = '--guides' in sys.argv
    cols = int(next((a.split('=')[1] for a in sys.argv if a.startswith('--cols=')), 3 if len(meta['frames']) > 4 else 2))
    rows = (len(meta['frames']) + cols - 1) // cols
    w, h = meta['width'], meta['height']
    pad, label = 12, 34
    sheet = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + pad + label) + pad), (24, 24, 28))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
    s = meta['scale']
    for i, frame in enumerate(meta['frames']):
        x = pad + (i % cols) * (w + pad)
        y = pad + (i // cols) * (h + pad + label)
        img = Image.open(folder / f"frame-{frame:04d}.png").convert('RGB')
        if guides:
            g = ImageDraw.Draw(img)
            for gx in (96, 1824):
                g.line([(gx * s, 0), (gx * s, h)], fill=(255, 0, 128), width=2)
            for gy in (120, 840, 880):
                g.line([(0, gy * s), (w, gy * s)], fill=(255, 0, 128), width=2)
        sheet.paste(img, (x, y + label))
        draw.text((x + 4, y + 4), f"f{frame}  {frame/60:.2f}s", font=font, fill=(235, 235, 240))
    suffix = '-guides' if guides else ''
    out = folder / ('contact-sheet' + suffix + '.png')
    sheet.save(out)
    print(out)

if __name__ == '__main__':
    main()
