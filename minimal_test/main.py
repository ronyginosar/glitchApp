from PIL import Image
import io
import random

def create_glitch(input_bytes: bytes, seed: int):
    random.seed(seed)
    data = bytearray(input_bytes)
    if len(data) < 200:
        return bytes(data), []
    chunks = []
    for _ in range(random.randint(5, 15)):
        s = random.randint(100, len(data) - 200)
        e = s + random.randint(10, 80)
        chunks.append((s, e))
        del data[s:e]
    return bytes(data), chunks

def to_png_bytes(tiff_bytes: bytes) -> bytes:
    im = Image.open(io.BytesIO(tiff_bytes))
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()

def build_metadata(name: str, seed: int, chunks, error=None):
    lines = [f"File: {name}", f"Seed: {seed}", f"Chunks removed: {len(chunks)}"]
    if error:
        lines.append(f"Error: {error}")
    return "\n".join(lines)
