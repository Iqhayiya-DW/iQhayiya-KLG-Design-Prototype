#!/usr/bin/env python3
import sys
from PIL import Image

src, dest, max_edge = sys.argv[1], sys.argv[2], int(sys.argv[3])
img = Image.open(src)
img = img.convert("RGB")
img.thumbnail((max_edge, max_edge))
img.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
