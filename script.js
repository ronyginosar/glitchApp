let pyodide = null;

// --- Load Pyodide + Python engine ---
async function initPyodide() {
  pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/" });
  console.log("✅ Pyodide ready");

  const mainPy = await fetch("main.py").then(r => r.text());
  const glitchMainPy = await fetch("glitch_main.py").then(r => r.text());
  pyodide.FS.writeFile("main.py", mainPy);
  pyodide.FS.writeFile("glitch_main.py", glitchMainPy);
  console.log("✅ Python files written to FS");

  await pyodide.loadPackage("micropip");
  await pyodide.runPythonAsync("import micropip; await micropip.install('Pillow')");
  console.log("✅ Pillow installed");
}

// --- Run glitching and return plain results ---
async function runGlitching(file, filename, variantCount, seedBase) {
  const buf = new Uint8Array(await file.arrayBuffer());
  pyodide.FS.writeFile("input.tiff", buf);

  const code = `
from glitch_main import handle_file_upload
with open("input.tiff", "rb") as f:
    data = f.read()
results = handle_file_upload(data, "${filename}", ${seedBase}, ${variantCount})
globals()["results"] = results
  `;
  await pyodide.runPythonAsync(code);

  const pyResults = pyodide.globals.get("results");
  const proxyList = pyResults.toJs({ create_proxies: true });
  const results = proxyList.map(r => Object.fromEntries(r.entries()));

  console.log("✅ Glitch results:", results);
  return results;
}

// --- UI + drag & drop ---
window.addEventListener("DOMContentLoaded", async () => {
  const dropzone = document.getElementById("dropzone");
  const button = document.getElementById("glitchButton");
  // const log = document.getElementById("log");
  let uploadedFile = null;

  dropzone.addEventListener("dragover", e => e.preventDefault());
  dropzone.addEventListener("drop", e => {
    e.preventDefault();
    uploadedFile = e.dataTransfer.files[0];
    dropzone.textContent = `Loaded: ${uploadedFile.name}`;
  });

  button.addEventListener("click", async () => {
    if (!uploadedFile) return alert("Please drop a file first.");
    // log.textContent = "⏳ Running glitch…";
    // const results = await runGlitching(uploadedFile, uploadedFile.name, 5, Math.floor(Math.random() * 9999));
    // log.textContent = JSON.stringify(results, null, 2);
    console.log("⏳ Running glitch…");
      const results = await runGlitching(
        uploadedFile,
        uploadedFile.name,
        5,
        Math.floor(Math.random() * 9999)
      );
      console.log("✅ Glitch results:", results);
    renderFileTree();  // refresh FS explorer
  });

  await initPyodide();
  renderFileTree();
});

function renderFileTree(path = ".", container = document.getElementById("fs-viewer")) {
  try {
    const entries = pyodide.FS.readdir(path).filter(e => e !== "." && e !== "..");
    container.innerHTML = `<b>${path}</b><br>`;
    const ul = document.createElement("ul");
    ul.style.listStyle = "none";
    ul.style.paddingLeft = "1em";

    entries.forEach(name => {
      const fullPath = path === "." ? name : `${path}/${name}`;
      const stat = pyodide.FS.stat(fullPath);
      const li = document.createElement("li");

      if (pyodide.FS.isDir(stat.mode)) {
        li.innerHTML = `📁 <a href="#" data-path="${fullPath}">${name}</a>`;
      } else {
        li.innerHTML = `📄 ${name} <button data-file="${fullPath}">⬇️</button>`;
      }

      ul.appendChild(li);
    });

    container.appendChild(ul);

    // Directory navigation
    container.querySelectorAll("a[data-path]").forEach(a => {
      a.onclick = e => {
        e.preventDefault();
        renderFileTree(e.target.dataset.path, container);
      };
    });

    // File download
    container.querySelectorAll("button[data-file]").forEach(btn => {
      btn.onclick = e => {
        const filePath = e.target.dataset.file;
        const bytes = pyodide.FS.readFile(filePath);
        const ext = filePath.split(".").pop();
        const mime =
          ext === "png" ? "image/png" :
          ext === "tiff" ? "image/tiff" :
          "application/octet-stream";
        const blob = new Blob([bytes], { type: mime });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filePath.split("/").pop();
        a.click();
      };
    });
  } catch (err) {
    container.innerHTML = `<span style="color:red">Error reading ${path}: ${err}</span>`;
  }
}

// let pyodide = null;

// // Load Python scripts into Pyodide's virtual filesystem
// async function loadPythonScripts() {
//   const mainPy = await fetch("main.py").then(res => res.text());
//   const glitchMainPy = await fetch("glitch_main.py").then(res => res.text());

//   pyodide.FS.writeFile("main.py", mainPy);
//   pyodide.FS.writeFile("glitch_main.py", glitchMainPy);

//   console.log("✅ Python files loaded into Pyodide FS");
// }

// // Load Pyodide, install packages, and import Python functions
// async function loadPyodideAndPackages() {
//   pyodide = await loadPyodide({
//     indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
//   });

//   console.log("✅ Pyodide and Python environment loaded.");

//   await pyodide.loadPackage("micropip");
//   console.log("📦 Loaded micropip");

//   await pyodide.runPythonAsync(`
//     import micropip
//     await micropip.install("Pillow")
//   `);
//   console.log("🖼️ Pillow installed");

//   await loadPythonScripts();

//   await pyodide.runPythonAsync(`
//     from main import create_glitch, to_png_bytes, build_metadata
//     from glitch_main import handle_file_upload
//   `);
//   console.log("🐍 Python functions imported");
// }

// // ✅ FIXED: Run glitching using a def function (not async def)
// async function runGlitching(file, filename, variantCount, seed) {
//   const buffer = new Uint8Array(await file.arrayBuffer());
//   pyodide.FS.writeFile("input.tiff", buffer);

//   const code = `
// from glitch_main import handle_file_upload
// with open("input.tiff", "rb") as f:
//     data = f.read()
// results = handle_file_upload(data, "${filename}")
// globals()["results"] = results
//   `;

//   await pyodide.runPythonAsync(code);
//   return pyodide.globals.get("results").toJs();
// }

// // Display glitched images and UI buttons
// function displayGlitchedImages(results) {
//   const gallery = document.getElementById("gallery");
//   gallery.innerHTML = "";

//   results.forEach((res, i) => {
//     const preview = document.createElement("div");
//     preview.className = "preview";

//     const img = document.createElement("img");
//     img.src = URL.createObjectURL(new Blob([res.png_bytes], { type: "image/png" }));

//     const meta = document.createElement("div");
//     meta.className = "meta";
//     meta.textContent = `Seed ${res.seed}`;

//     const dlBtn = document.createElement("button");
//     dlBtn.textContent = "Download ZIP";
//     dlBtn.onclick = () => exportAsZip(i, res);

//     preview.appendChild(img);
//     preview.appendChild(meta);
//     preview.appendChild(dlBtn);
//     gallery.appendChild(preview);
//   });
// }

// // Export result as ZIP
// function exportAsZip(index, res) {
//   const zip = new JSZip();
//   zip.file(`glitch_${index}.tiff`, res.tiff_bytes);
//   zip.file(`glitch_${index}.png`, res.png_bytes);
//   zip.file(`glitch_${index}_metadata.txt`, res.meta_bytes);

//   zip.generateAsync({ type: "blob" }).then(blob => {
//     const a = document.createElement("a");
//     a.href = URL.createObjectURL(blob);
//     a.download = `glitch_${index}.zip`;
//     a.click();
//   });
// }

// // UI logic
// window.addEventListener("DOMContentLoaded", () => {
//   const dropzone = document.getElementById("dropzone");
//   const glitchButton = document.getElementById("glitchButton");

//   let uploadedFile = null;
//   let uploadedName = "";

//   dropzone.addEventListener("dragover", e => {
//     e.preventDefault();
//     dropzone.classList.add("hover");
//   });

//   dropzone.addEventListener("dragleave", () => {
//     dropzone.classList.remove("hover");
//   });

//   dropzone.addEventListener("drop", e => {
//     e.preventDefault();
//     const file = e.dataTransfer.files[0];
//     if (file) {
//       uploadedFile = file;
//       uploadedName = file.name;
//       dropzone.textContent = `Loaded: ${file.name}`;
//       dropzone.classList.remove("hover");
//     }
//   });

//   glitchButton.addEventListener("click", async () => {
//     if (!uploadedFile) {
//       alert("Please drop a TIFF file.");
//       return;
//     }

//     const variantCount = parseInt(document.getElementById("variantCount").value || "1");
//     const seed = Math.floor(Math.random() * 99999);

//     try {
//       const results = await runGlitching(uploadedFile, uploadedName, variantCount, seed);
//       displayGlitchedImages(results);
//     } catch (err) {
//       console.error("⚠️ Glitching error:", err);
//       alert("An error occurred during glitching. Check console for details.");
//     }
//   });
// });

// // Initial load
// loadPyodideAndPackages();
