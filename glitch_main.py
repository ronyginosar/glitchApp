import js
from main import create_glitch, to_png_bytes, build_metadata

async def handle_file_upload(file_data, filename, seed, num_variants):
    outputs = []

    for i in range(num_variants):
        variant_seed = seed + i
        glitched_bytes, chunks = create_glitch(file_data, variant_seed)
        png_bytes = to_png_bytes(glitched_bytes)
        meta_txt = build_metadata(filename, variant_seed, chunks)

        outputs.append({
            'seed': variant_seed,
            'tiff_bytes': glitched_bytes,
            'png_bytes': png_bytes,
            'meta_bytes': meta_txt
        })

    return outputs