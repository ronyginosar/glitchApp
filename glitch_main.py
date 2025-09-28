import sys
import random
from pathlib import Path
from PIL import Image, ImageFile
from main import create_glitch, to_png_bytes, build_metadata

ImageFile.LOAD_TRUNCATED_IMAGES = True

def handle_file_upload(input_path: Path, number_of_variants: int = 5):
    output_folder = Path("outputs") / input_path.stem
    output_folder.mkdir(parents=True, exist_ok=True)

    # Save original image as TIFF
    original_tiff_path = output_folder / f"{input_path.stem}_original.tiff"
    Image.open(input_path).save(original_tiff_path, format="TIFF")

    with open(original_tiff_path, "rb") as f:
        original_bytes = f.read()

    # Determine starting index for naming
    existing = list(output_folder.glob("glitch_*_metadata.txt"))
    start_index = len(existing) + 1

    for i in range(start_index, start_index + number_of_variants):
        seed = i
        tiff_path = output_folder / f"glitch_{i}.tiff"
        png_path = output_folder / f"glitch_{i}.png"
        meta_path = output_folder / f"glitch_{i}_metadata.txt"

        glitch_bytes, removed = create_glitch(original_bytes, seed)

        with open(tiff_path, "wb") as f:
            f.write(glitch_bytes)

        try:
            png_bytes = to_png_bytes(glitch_bytes)
            with open(png_path, "wb") as f:
                f.write(png_bytes)
            meta = build_metadata(input_path.name, seed, removed)
        except Exception as e:
            meta = build_metadata(input_path.name, seed, removed, error=str(e))

        with open(meta_path, "w") as f:
            f.write(meta)

    print(f"✅ Done! {number_of_variants} glitched variants saved in {output_folder}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main.py path/to/image.jpg [num_variants]")
        sys.exit(1)

    image_path = Path(sys.argv[1])
    variants = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    handle_file_upload(image_path, variants)