import os
import random
from PIL import Image, ImageFile
from pathlib import Path

# ---- Config ----
input_image_path = Path('sampleImages/RachelRuysch-StillLifewithFlowers-1716.jpg')  # <-- change this to your input image
output_folder = Path('outputs')
output_folder.mkdir(exist_ok=True)
number_of_variants = 5  # Number of glitched variants to create

ImageFile.LOAD_TRUNCATED_IMAGES = True  # allow truncated images to load

# ---- TIFF header/footer constants ----
# TIFF_HEADER_LEN = 8          # Standard 8‑byte TIFF header :contentReference[oaicite:1]{index=1}
# TIFF_FOOTER_LEN = 0          # No fixed footer in TIFF baseline format

# ---- Glitch safety parameters (for proportional control) ----
PERCENT_HEADER_PROTECT = 0.02   # skip first 2% of file (metadata/header)
PERCENT_FOOTER_PROTECT = 0.02   # skip last 2% of file (footer or tags)

# ---- Glitch targeting zone ----
# "Many glitch artists report the most interesting effects when deleting bytes from the middle 30–70% of the file, where TIFF often stores color channels, strip data, etc."
GLITCH_ZONE_START = 0.30  # start deleting after 30% of file
GLITCH_ZONE_END = 0.70    # stop deleting after 70%



# ---- Load original image, get basename ----
orig_name = input_image_path.stem
dest_folder = output_folder / orig_name
dest_folder.mkdir(exist_ok=True)

original_tiff = dest_folder / f"{orig_name}_original.tiff"
Image.open(input_image_path).save(original_tiff, format='TIFF')

with open(original_tiff, 'rb') as f:
    original_bytes = f.read()

# ---- Determine next index (continue numbering) ----
existing = list(dest_folder.glob(f"glitch_*_metadata.txt"))
start_index = len(existing) + 1

# ---- Glitch function avoiding header/footer ----
def create_glitch(bytes_data: bytes, seed: int):
    random.seed(seed)
    data = bytearray(bytes_data)
    chunks = []
    num_chunks = random.randint(5, 20)

    # safe_start = TIFF_HEADER_LEN
    # safe_end = len(data) - TIFF_FOOTER_LEN - 1
    file_len = len(data)

    # Calculate safe boundaries (still tracked)
    safe_start = int(file_len * PERCENT_HEADER_PROTECT)
    safe_end = int(file_len * (1 - PERCENT_FOOTER_PROTECT)) - 1

    # Define middle zone for glitching
    # glitch_zone_start = int(file_len * GLITCH_ZONE_START)
    # glitch_zone_end = int(file_len * GLITCH_ZONE_END)

    for _ in range(num_chunks):
        # s = random.randint(safe_start, safe_end - 300)
        
        # TODO change var names to meaningful ones

        # dynamic calc of range, instead of updating safe_end after deletion
        file_len = len(data)
        # Define middle zone for glitching
        glitch_zone_start = int(file_len * GLITCH_ZONE_START)
        glitch_zone_end = int(file_len * GLITCH_ZONE_END)

        s = random.randint(glitch_zone_start, glitch_zone_end - 300)
        e = s + random.randint(20, 300)
        # e = min(e, safe_end)
        e = min(e, len(data) - 1)

        chunks.append((s, e))
        del data[s:e]
        # safe_end = len(data) - TIFF_FOOTER_LEN - 1
        # safe_end = len(data) - 1  # update after deletion

    return data, chunks

if __name__ == "__main__":
    # image processing loop

    # ---- Generate glitched versions ----
    for i in range(start_index, start_index + number_of_variants):
        seed = i
        tiff_path = dest_folder / f"glitch_{i}.tiff"
        png_path = dest_folder / f"glitch_{i}.png"
        meta_path = dest_folder / f"glitch_{i}_metadata.txt"

        glitch_bytes, removed = create_glitch(original_bytes, seed)

        with open(tiff_path, 'wb') as f:
            f.write(glitch_bytes)

        try:
            im = Image.open(tiff_path)
            im.save(png_path, format='PNG')
            im.close()
            meta_info = [
                f"Original filename: {input_image_path.name}",
                f"Seed: {seed}",
                f"Chunks removed: {len(removed)}"
            ] + [f"Chunk {idx+1}: start={s}, end={e}, length={e-s}" for idx, (s, e) in enumerate(removed)]
        except Exception as e:
            meta_info = [
                f"Original filename: {input_image_path.name}",
                f"Seed: {seed}",
                f"Chunks removed: {len(removed)}",
                f"Error opening TIFF or generating PNG: {e}"
            ]

        with open(meta_path, 'w') as f:
            f.write("\n".join(meta_info))

    print("Done! Glitched variants in:", dest_folder)

