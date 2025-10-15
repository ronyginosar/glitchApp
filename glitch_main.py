"""
A simple wrapper to glitch images using functions from main.py.
It defines a handle_file_upload() function that:
    • accepts input bytes and parameters,
    • runs multiple glitches with different seeds,
    • saves results to /outputs,
    • returns file paths and metadata.
This module is designed to be used
both in CLI mode and imported into a web interface.
It can be run directly from the command line for quick tests.
"""

from pathlib import Path
from main import create_glitch, to_png_bytes, build_metadata
import sys


def handle_file_upload(input_bytes: bytes, input_filename: str, base_seed: int = 0, num_variants: int = 5):
    """
    Takes input bytes and runs multiple glitches.
    Saves results to /outputs and returns file paths + metadata.
    """
    output_folder = Path("outputs") / Path(input_filename).stem
    output_folder.mkdir(parents=True, exist_ok=True)

    results = []
    for i in range(num_variants):
        seed = base_seed + i
        tiff_bytes, removed = create_glitch(input_bytes, seed)

        tiff_path = output_folder / f"glitch_{seed}.tiff"
        with open(tiff_path, "wb") as f:
            f.write(tiff_bytes)

        try:
            png_bytes = to_png_bytes(tiff_bytes)
            png_path = output_folder / f"glitch_{seed}.png"
            with open(png_path, "wb") as f:
                f.write(png_bytes)
            meta = build_metadata(input_filename, seed, removed)
        except Exception as e:
            meta = build_metadata(input_filename, seed, removed, error=str(e))
            png_path = None

        results.append({
            "seed": seed,
            "tiff_path": str(tiff_path),
            "png_path": str(png_path) if png_path else "failed",
            "meta": meta
        })

    print(f"✅ {len(results)} variants saved in {output_folder}")
    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python main.py path/to/image.jpg [num_variants]")
        sys.exit(1)

    image_path = Path(sys.argv[1])
    variants = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    handle_file_upload(image_path, variants)

# TODO: clean up CLI mode, or move to separate file
# if __name__ == "__main__":
#     if len(sys.argv) < 2:
#         print("Usage: python main.py path/to/image.jpg [num_variants]")
#         sys.exit(1)

#     image_path = Path(sys.argv[1])
#     variants = int(sys.argv[2]) if len(sys.argv) > 2 else 5
#     handle_file_upload(image_path, variants)



#     # TODO make test mode:# CLI Test mode, inside tests.py
#     # from PIL import Image
#     # import os


#     # test_image_path = Path("sampleImages/RachelRuysch-StillLifewithFlowers-1716.jpg")
#     # output_dir = Path("outputs") / test_image_path.stem
#     # output_dir.mkdir(parents=True, exist_ok=True)


#     # input_bytes = test_image_path.read_bytes()
#     # results = handle_file_upload(input_bytes, test_image_path.name, num_variants=5)


#     # for r in results:
#     # base = output_dir / r["filename_base"]


#     # with open(base.with_suffix(".tiff"), "wb") as f:
#     # f.write(r["tiff_bytes"])


#     # with open(base.with_suffix(".png"), "wb") as f:
#     # f.write(r["png_bytes"])


#     # with open(base.with_name(base.name + "_metadata.txt"), "w") as f:
#     # f.write(r["metadata"])


#     # print("✅ CLI Glitching Complete.")