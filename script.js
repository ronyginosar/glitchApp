// glitch_gui_script.js (Pyodide-enabled)

import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";

let pyodide;

async function initPyodideAndPackages() {
  pyodide = await loadPyodide();
  await pyodide.loadPackage(['micropip']);
  await pyodide.runPythonAsync(`
    import micropip
    await micropip.install('Pillow')
  `);
  await pyodide.runPythonAsync(await (await fetch('glitch.py')).text());
  await pyodide.runPythonAsync(await (await fetch('main.py')).text());
  console.log("Pyodide and Python packages loaded.");
}

async function runGlitching(file, filename, variantCount, seed) {
  const buffer = new Uint8Array(await file.arrayBuffer());
  pyodide.FS.writeFile('input.tiff', buffer);

  const pythonCode = `
from main import handle_file_upload
with open('input.tiff', 'rb') as f:
    data = f.read()
results = await handle_file_upload(data, '${filename}', ${seed}, ${variantCount})
  `;

  await pyodide.runPythonAsync(pythonCode);
  const results = pyodide.globals.get("results").toJs();
  return results;
}

function displayGlitchedImages(results) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = '';
  results.forEach((res, i) => {
    const preview = document.createElement('div');
    preview.className = 'preview';

    const img = document.createElement('img');
    img.src = URL.createObjectURL(new Blob([res.png_bytes], { type: 'image/png' }));

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `Seed ${res.seed}`;

    const dlBtn = document.createElement('button');
    dlBtn.textContent = 'Download ZIP';
    dlBtn.onclick = () => exportAsZip(i, res);

    preview.appendChild(img);
    preview.appendChild(meta);
    preview.appendChild(dlBtn);
    gallery.appendChild(preview);
  });
}

function exportAsZip(i, res) {
  const zip = new JSZip();
  zip.file(`glitch_${i}.tiff`, res.tiff_bytes);
  zip.file(`glitch_${i}.png`, res.png_bytes);
  zip.file(`glitch_${i}_metadata.txt`, res.meta_bytes);
  zip.generateAsync({ type: 'blob' }).then(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `glitch_${i}.zip`;
    a.click();
  });
}

// Hook into UI
window.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  const glitchButton = document.getElementById('glitchButton');

  let uploadedFile = null;
  let uploadedName = '';

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('hover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('hover');
  });

  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      uploadedFile = file;
      uploadedName = file.name;
      dropzone.textContent = `Loaded: ${file.name}`;
    }
  });

  glitchButton.addEventListener('click', async () => {
    if (!uploadedFile) {
      alert("Please drop a TIFF file.");
      return;
    }
    const variantCount = parseInt(document.getElementById('variantCount').value);
    const seed = Math.floor(Math.random() * 99999);
    const results = await runGlitching(uploadedFile, uploadedName, variantCount, seed);
    displayGlitchedImages(results);
  });

  initPyodideAndPackages();
});