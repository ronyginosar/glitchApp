from pathlib import Path
from main import create_glitch, to_png_bytes, build_metadata

def handle_file_upload(input_bytes: bytes, input_filename: str, base_seed: int = 0, num_variants: int = 5):
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
            png_path = "failed"

        results.append({
            "seed": seed,
            "tiff_path": str(tiff_path),
            "png_path": str(png_path),
            "meta": meta
        })
    print(f"✅ {len(results)} variants saved in {output_folder}")
    return results
