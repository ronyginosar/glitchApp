let pyodide = null;

// Load Python scripts into Pyodide's virtual filesystem
async function loadPythonScripts() {
  const mainPy = await fetch("main.py").then(res => res.text());
  const glitchMainPy = await fetch("glitch_main.py").then(res => res.text());

  pyodide.FS.writeFile("main.py", mainPy);
  pyodide.FS.writeFile("glitch_main.py", glitchMainPy);

  console.log("✅ Python files loaded into Pyodide FS");
}

// Load Pyodide, install packages, and import Python functions
async function loadPyodideAndPackages() {
  pyodide = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
  });

  console.log("✅ Pyodide and Python environment loaded.");

  await pyodide.loadPackage("micropip");
  console.log("📦 Loaded micropip");

  await pyodide.runPythonAsync(`
    import micropip
    await micropip.install("Pillow")
  `);
  console.log("🖼️ Pillow installed");

  await loadPythonScripts();

  await pyodide.runPythonAsync(`
    from main import create_glitch, to_png_bytes, build_metadata
    from glitch_main import handle_file_upload
  `);
  console.log("🐍 Python functions imported");
}

// ✅ FIXED: Run glitching using a def function (not async def)
async function runGlitching(file, filename, variantCount, seed) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  pyodide.FS.writeFile("input.tiff", buffer);

  const code = `
from glitch_main import handle_file_upload
with open("input.tiff", "rb") as f:
    data = f.read()
results = handle_file_upload(data, "${filename}")
globals()["results"] = results
  `;

  await pyodide.runPythonAsync(code);
  return pyodide.globals.get("results").toJs();
}

// Display glitched images and UI buttons
function displayGlitchedImages(results) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "";

  results.forEach((res, i) => {
    const preview = document.createElement("div");
    preview.className = "preview";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(new Blob([res.png_bytes], { type: "image/png" }));

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = `Seed ${res.seed}`;

    const dlBtn = document.createElement("button");
    dlBtn.textContent = "Download ZIP";
    dlBtn.onclick = () => exportAsZip(i, res);

    preview.appendChild(img);
    preview.appendChild(meta);
    preview.appendChild(dlBtn);
    gallery.appendChild(preview);
  });
}

// Export result as ZIP
function exportAsZip(index, res) {
  const zip = new JSZip();
  zip.file(`glitch_${index}.tiff`, res.tiff_bytes);
  zip.file(`glitch_${index}.png`, res.png_bytes);
  zip.file(`glitch_${index}_metadata.txt`, res.meta_bytes);

  zip.generateAsync({ type: "blob" }).then(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `glitch_${index}.zip`;
    a.click();
  });
}

// UI logic
window.addEventListener("DOMContentLoaded", () => {
  const dropzone = document.getElementById("dropzone");
  const glitchButton = document.getElementById("glitchButton");

  let uploadedFile = null;
  let uploadedName = "";

  dropzone.addEventListener("dragover", e => {
    e.preventDefault();
    dropzone.classList.add("hover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("hover");
  });

  dropzone.addEventListener("drop", e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      uploadedFile = file;
      uploadedName = file.name;
      dropzone.textContent = `Loaded: ${file.name}`;
      dropzone.classList.remove("hover");
    }
  });

  glitchButton.addEventListener("click", async () => {
    if (!uploadedFile) {
      alert("Please drop a TIFF file.");
      return;
    }

    const variantCount = parseInt(document.getElementById("variantCount").value || "1");
    const seed = Math.floor(Math.random() * 99999);

    try {
      const results = await runGlitching(uploadedFile, uploadedName, variantCount, seed);
      displayGlitchedImages(results);
    } catch (err) {
      console.error("⚠️ Glitching error:", err);
      alert("An error occurred during glitching. Check console for details.");
    }
  });
});

// Initial load
loadPyodideAndPackages();
