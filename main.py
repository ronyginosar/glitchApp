"""
====================================================
 Glitch Engine — Core Image Manipulation Functions
====================================================

This module provides the core low-level glitch logic used
both in standalone Python runs and within the Pyodide (JS)
web interface.

It defines three main functions:

    • create_glitch()    → randomly deletes chunks of bytes
                           from image data, producing glitch artifacts.
    • to_png_bytes()     → converts TIFF byte data into PNG bytes
                           for browser display or file export.
    • build_metadata()   → constructs a human-readable log of the
                           seed, removed chunks, and any conversion errors.

NOTE:
This file is treated as the stable “engine” layer — it should not
depend on browser logic or Pyodide interfaces. Higher-level control,
such as file saving or user parameters, is implemented externally
in glitch_main.py and script.js.
secondary note: a lot moved to glitch_main.py and params are now passed in rather than hardcoded

"""

import os
import random
from PIL import Image, ImageFile
from pathlib import Path
from io import BytesIO

ImageFile.LOAD_TRUNCATED_IMAGES = True  # allow truncated images to load

# ---- Glitch safety parameters (for proportional control) ----
PERCENT_HEADER_PROTECT = 0.02   # skip first 2% of file (metadata/header)
PERCENT_FOOTER_PROTECT = 0.02   # skip last 2% of file (footer or tags)

# ---- Glitch targeting zone ----
# "Many glitch artists report the most interesting effects when deleting bytes from the middle 30–70% of the file, where TIFF often stores color channels, strip data, etc."
GLITCH_ZONE_START = 0.30  # start deleting after 30% of file
GLITCH_ZONE_END = 0.70    # stop deleting after 70%

DEFAULT_MIN_CHUNK = 20
DEFAULT_MAX_CHUNK = 300

# ---- Glitch function avoiding header/footer ----
def create_glitch(bytes_data: bytes, seed: int = 0, num_chunks: int = 10, min_chunk=DEFAULT_MIN_CHUNK, max_chunk=DEFAULT_MAX_CHUNK):
    random.seed(seed)
    data = bytearray(bytes_data)
    chunks = []

    for _ in range(num_chunks):
        file_len = len(data)
        glitch_zone_start = int(file_len * GLITCH_ZONE_START)
        glitch_zone_end = int(file_len * GLITCH_ZONE_END)

        if glitch_zone_end - glitch_zone_start < max_chunk:
            break

        s = random.randint(glitch_zone_start, glitch_zone_end - max_chunk)
        chunk_len = random.randint(min_chunk, max_chunk)
        e = min(s + chunk_len, file_len - 1)

        chunks.append((s, e))
        del data[s:e]

    return data, chunks

# ---- helper ------
def to_png_bytes(tiff_bytes):
    """
    Tries to convert TIFF bytes to PNG bytes.
    Returns PNG bytes, or raises an error.
    """
    with BytesIO(tiff_bytes) as tiff_io:
        try:
            with Image.open(tiff_io) as im:
                with BytesIO() as out_png:
                    im.save(out_png, format='PNG')
                    return out_png.getvalue()
        except Exception as e:
            raise RuntimeError(f"Failed to convert to PNG: {e}")

def build_metadata(original_filename: str, seed: int, chunks, error: str = None) -> str:
    """
    Builds the metadata string to write to file.
    """
    lines = [
        f"Original filename: {original_filename}",
        f"Seed: {seed}",
        f"Chunks removed: {len(chunks)}"
    ]

    for idx, (s, e) in enumerate(chunks):
        lines.append(f"Chunk {idx+1}: start={s}, end={e}, length={e-s}")

    if error:
        lines.append(f"Error opening TIFF or generating PNG: {error}")

    return "\n".join(lines)

