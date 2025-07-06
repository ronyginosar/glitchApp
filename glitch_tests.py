from pathlib import Path
from PIL import Image
from main import create_glitch  # ← Import from your main file

# --- Config ---
input_image_path = Path("sampleImages/EBM portraits-1.jpg")
original_tiff_path = Path("test_original.tiff")
output_folder = Path("seed_tests")
output_folder.mkdir(exist_ok=True)

# --- Prepare original TIFF ---
Image.open(input_image_path).save(original_tiff_path, format='TIFF')
with open(original_tiff_path, 'rb') as f:
    original_bytes = bytearray(f.read())

# --- Test multiple seeds ---
print("Testing seeds...")
for seed in range(100):
    tiff_path = output_folder / f"glitch_seed_{seed}.tiff"
    glitched_bytes, _ = create_glitch(original_bytes, seed)
    with open(tiff_path, 'wb') as f:
        f.write(glitched_bytes)

    try:
        Image.open(tiff_path).load()
        print(f"Seed {seed}: ✅ OK")
    except Exception as e:
        print(f"Seed {seed}: ❌ Failed - {e}")
