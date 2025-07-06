import os
import random
from PIL import Image, ImageFile
from pathlib import Path

# ---- Config ----
input_image_path = Path('sampleImages/EBM portraits-1.jpg')  # <-- change this to your input image
output_folder = Path('outputs')
output_folder.mkdir(exist_ok=True)

ImageFile.LOAD_TRUNCATED_IMAGES = True  # 🆕 allow truncated images to load


# V0

# # ---- Step 1: Convert input to original TIFF ----
# original_tiff_path = output_folder / 'original.tiff'
# Image.open(input_image_path).save(original_tiff_path, format='TIFF')

# # ---- Step 2: Read TIFF as binary ----
# with open(original_tiff_path, 'rb') as f:
#     original_bytes = bytearray(f.read())

# # ---- Step 3: Glitch Generator ----
# def create_glitch(bytes_data, seed):
#     random.seed(seed)
#     glitched = bytearray(bytes_data)  # copy of the original
#     chunks = []

#     num_chunks = random.randint(5, 20)
#     for _ in range(num_chunks):
#         start = random.randint(100, len(glitched) - 1000)
#         end = start + random.randint(20, 300)
#         chunks.append((start, end))
#         del glitched[start:end]

#     return glitched, chunks

# # ---- Step 4: Save Glitched Versions ----
# for i in range(10):
#     seed = i
#     tiff_path = output_folder / f'glitch_{i+1}.tiff'
#     png_path = output_folder / f'glitch_{i+1}.png'
#     txt_path = output_folder / f'glitch_{i+1}_metadata.txt'

#     glitched_bytes, removed_chunks = create_glitch(original_bytes, seed)

#     # Save glitched TIFF
#     with open(tiff_path, 'wb') as f:
#         f.write(glitched_bytes)

#     # Attempt to open and save PNG preview
#     try:
#         img = Image.open(tiff_path)
#         img.save(png_path, format='PNG')
#         img.close()
#     except Exception as e:
#         with open(txt_path, 'w') as f:
#             f.write(f"Seed: {seed}\n")
#             f.write("Failed to open TIFF for PNG conversion.\n")
#             f.write(f"Error: {str(e)}\n")
#         continue

#     # Save metadata
#     with open(txt_path, 'w') as f:
#         f.write(f"Seed: {seed}\n")
#         f.write(f"Chunks removed: {len(removed_chunks)}\n")
#         for idx, (start, end) in enumerate(removed_chunks):
#             f.write(f"  Chunk {idx+1}: start={start}, end={end}, length={end-start}\n")

# print("Done! All glitched files and metadata saved to 'outputs/' folder.")

# V1

# ---- TIFF header/footer constants ----
TIFF_HEADER_LEN = 8          # Standard 8‑byte TIFF header :contentReference[oaicite:1]{index=1}
TIFF_FOOTER_LEN = 0          # No fixed footer in TIFF baseline format

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
    safe_start = TIFF_HEADER_LEN
    safe_end = len(data) - TIFF_FOOTER_LEN - 1
    for _ in range(num_chunks):
        s = random.randint(safe_start, safe_end - 300)
        e = s + random.randint(20, 300)
        e = min(e, safe_end)
        chunks.append((s, e))
        del data[s:e]
        safe_end = len(data) - TIFF_FOOTER_LEN - 1
    return data, chunks

# ---- Generate glitched versions ----
for i in range(start_index, start_index + 10):
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

# V2

# # ---- Load original and prepare folder ----
# orig_name = input_image_path.stem
# dest_folder = output_folder / orig_name
# dest_folder.mkdir(exist_ok=True)

# original_tiff = dest_folder / f"{orig_name}_original.tiff"
# Image.open(input_image_path).save(original_tiff, format='TIFF')

# with open(original_tiff, 'rb') as f:
#     original_bytes = f.read()

# file_len = len(original_bytes)

# # ---- Glitch safety parameters ----
# PERCENT_HEADER = 0.02   # skip first 2%
# PERCENT_FOOTER = 0.02   # skip last 2%
# CHUNK_SIZE_MIN_FRAC = 0.001  # 0.1% of file length
# CHUNK_SIZE_MAX_FRAC = 0.01   # 1% of file length

# safe_start = int(file_len * PERCENT_HEADER)
# safe_end = int(file_len * (1 - PERCENT_FOOTER))

# # ---- Continue numbering
# existing = list(dest_folder.glob("glitch_*_metadata.txt"))
# start_index = len(existing) + 1

# # ---- Glitch function with proportional chunking ----
# def create_glitch(data_bytes: bytes, seed: int):
#     random.seed(seed)
#     data = bytearray(data_bytes)
#     chunks = []

#     num_chunks = random.randint(5, 15)

#     for _ in range(num_chunks):
#         current_len = len(data)
#         safe_start = int(current_len * PERCENT_HEADER)
#         safe_end = int(current_len * (1 - PERCENT_FOOTER))

#         min_chunk = int(current_len * CHUNK_SIZE_MIN_FRAC)
#         max_chunk = int(current_len * CHUNK_SIZE_MAX_FRAC)
#         if safe_end - safe_start < min_chunk:
#             break  # not enough room to remove another chunk safely

#         chunk_len = random.randint(min_chunk, max_chunk)
#         s = random.randint(safe_start, safe_end - chunk_len - 1)
#         e = s + chunk_len
#         chunks.append((s, e))
#         del data[s:e]

#     return data, chunks



# # ---- Generate glitched images ----
# for i in range(start_index, start_index + 10):
#     seed = i
#     tiff_path = dest_folder / f"glitch_{i}.tiff"
#     png_path = dest_folder / f"glitch_{i}.png"
#     meta_path = dest_folder / f"glitch_{i}_metadata.txt"

#     glitched_bytes, removed_chunks = create_glitch(original_bytes, seed)

#     with open(tiff_path, 'wb') as f:
#         f.write(glitched_bytes)

#     try:
#         im = Image.open(tiff_path)
#         im.save(png_path, format='PNG')
#         im.close()
#         meta_lines = [
#             f"Original filename: {input_image_path.name}",
#             f"Seed: {seed}",
#             f"Chunks removed: {len(removed_chunks)}",
#             f"Header skip: {safe_start} bytes",
#             f"Footer skip: {file_len - safe_end} bytes",
#         ] + [
#             f"  Chunk {idx+1}: start={s}, end={e}, length={e-s}"
#             for idx, (s, e) in enumerate(removed_chunks)
#         ]
#     except Exception as e:
#         meta_lines = [
#             f"Original filename: {input_image_path.name}",
#             f"Seed: {seed}",
#             f"Error reading back TIFF: {e}",
#             f"Chunks removed: {len(removed_chunks)}",
#         ]

#     with open(meta_path, 'w') as f:
#         f.write("\n".join(meta_lines))

# print("Done! Glitched images saved to:", dest_folder)


# # new v2?

# # import os
# # import random
# # from PIL import Image
# # from pathlib import Path

# # # ---- Config ----
# # input_image_path = Path('input.jpg')  # ← Change to your image
# # output_folder = Path('outputs')
# # output_folder.mkdir(exist_ok=True)

# # ---- Setup output subfolder ----
# orig_name = input_image_path.stem
# dest_folder = output_folder / orig_name
# dest_folder.mkdir(exist_ok=True)

# # ---- Create and read original TIFF ----
# original_tiff = dest_folder / f"{orig_name}_original.tiff"
# Image.open(input_image_path).save(original_tiff, format='TIFF')
# with open(original_tiff, 'rb') as f:
#     original_bytes = bytearray(f.read())

# # ---- Safe constants ----
# PERCENT_HEADER = 0.02
# PERCENT_FOOTER = 0.02
# CHUNK_SIZE_MIN_FRAC = 0.001
# CHUNK_SIZE_MAX_FRAC = 0.01

# # ---- Continue numbering
# existing = list(dest_folder.glob("glitch_*_metadata.txt"))
# start_index = len(existing) + 1

# # ---- Safe glitch function ----
# def create_glitch(original_data: bytearray, seed: int):
#     random.seed(seed)
#     data = bytearray(original_data)  # copy to avoid mutation
#     chunks = []

#     for _ in range(random.randint(5, 15)):
#         current_len = len(data)
#         safe_start = int(current_len * PERCENT_HEADER)
#         safe_end = int(current_len * (1 - PERCENT_FOOTER))

#         min_chunk = max(20, int(current_len * CHUNK_SIZE_MIN_FRAC))
#         max_chunk = max(min_chunk + 1, int(current_len * CHUNK_SIZE_MAX_FRAC))
#         if safe_end - safe_start < min_chunk:
#             break  # avoid invalid range

#         chunk_len = random.randint(min_chunk, max_chunk)
#         start = random.randint(safe_start, safe_end - chunk_len)
#         end = start + chunk_len

#         chunks.append((start, end))
#         del data[start:end]

#     return data, chunks

# if __name__ == "__main__":
# # Your image processing loop here

#     # ---- Generate glitches ----
#     for i in range(start_index, start_index + 10):
#         seed = i
#         tiff_path = dest_folder / f"glitch_{i}.tiff"
#         png_path = dest_folder / f"glitch_{i}.png"
#         meta_path = dest_folder / f"glitch_{i}_metadata.txt"

#         glitched_bytes, removed_chunks = create_glitch(original_bytes, seed)

#         with open(tiff_path, 'wb') as f:
#             f.write(glitched_bytes)

#         try:
#             img = Image.open(tiff_path)
#             img.load()  # force decode before saving to catch early issues
#             img.save(png_path, format='PNG')
#             img.close()

#             meta_info = [
#                 f"Original filename: {input_image_path.name}",
#                 f"Seed: {seed}",
#                 f"Chunks removed: {len(removed_chunks)}",
#             ] + [f"  Chunk {j+1}: start={s}, end={e}, length={e-s}"
#                 for j, (s, e) in enumerate(removed_chunks)]

#         except Exception as e:
#             meta_info = [
#                 f"Original filename: {input_image_path.name}",
#                 f"Seed: {seed}",
#                 f"ERROR: Could not open glitched TIFF for PNG",
#                 f"Exception: {str(e)}",
#                 f"Chunks removed: {len(removed_chunks)}",
#             ]

#         with open(meta_path, 'w') as f:
#             f.write("\n".join(meta_info))

#     print("✅ Done. Check output folder:", dest_folder)

