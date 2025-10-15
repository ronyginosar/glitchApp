let pyodide = null;

// --- Load Pyodide + Python engine ---
async function initPyodide() {
  pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/" });
  console.log("✅ Pyodide ready");

  const mainPy = await fetch("main.py").then(r => r.text());
  const glitchMainPy = await fetch("glitch_main.py").then(r => r.text());
  pyodide.FS.writeFile("main.py", mainPy);
  pyodide.FS.writeFile("glitch_main.py", glitchMainPy);
  console.log("✅ Python files written to FS FileSystem");

  await pyodide.loadPackage("micropip");
  console.log("📦 Loaded micropip");
  await pyodide.runPythonAsync("import micropip; await micropip.install('Pillow')");
  console.log("🖼️ Pillow installed");
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
  console.log("🐍 Python functions imported");

  const pyResults = pyodide.globals.get("results");
  const proxyList = pyResults.toJs({ create_proxies: true });
  const results = proxyList.map(r => Object.fromEntries(r.entries()));

  // console.log("✅ Glitch results:", results);
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
    // determine output folder from filename, use the same folder convention used in Python
    const folderPath = `outputs/${uploadedFile.name.split(".")[0]}`;
    showGallery(folderPath);
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

function showGallery(folderPath) {
  const gallery = document.getElementById("gallery");
  gallery.innerHTML = "⏳ Loading PNGs…";

  try {
    const files = pyodide.FS.readdir(folderPath).filter(f => f.toLowerCase().endsWith(".png"));
    gallery.innerHTML = "";

    files.forEach(pngName => {
      const pngPath = `${folderPath}/${pngName}`;
      const seed = seedFromFilename(pngName);
      const stem = stemOf(pngName);

      const card = document.createElement("div");
      card.className = "thumb";

      const pngBytes = fsRead(pngPath);
      const pngBlob = new Blob([pngBytes], { type: "image/png" });
      const pngURL = URL.createObjectURL(pngBlob);

      const img = document.createElement("img");
      img.src = pngURL;
      img.alt = pngName;

      const overlay = document.createElement("div");
      overlay.className = "overlay";

      const seedLabel = document.createElement("div");
      seedLabel.className = "seed";
      seedLabel.textContent = seed !== null ? `Seed ${seed}` : pngName;

      const actions = document.createElement("div");
      actions.className = "actions";

      // --- PNG Download button ---
      const btnPng = document.createElement("button");
      btnPng.className = "btn";
      btnPng.innerHTML = `<span class="material-symbols-outlined">download</span>`;
      btnPng.title = "Download PNG";
      btnPng.onclick = () => downloadBytes(pngBytes, pngName, "image/png");

      // --- ZIP Download button ---
      const btnZip = document.createElement("button");
      btnZip.className = "btn";
      btnZip.innerHTML = `<span class="material-symbols-outlined">folder_zip</span>`;
      btnZip.title = "Download ZIP (PNG + TIFF + meta)";
      btnZip.onclick = () => {
        try {
          const zip = new JSZip();
          const tiffPath = `${folderPath}/glitch_${seed}.tiff`;
          const metaPath = `${folderPath}/glitch_${seed}_metadata.txt`;

          zip.file(pngName, pngBytes);
          try {
            zip.file(`glitch_${seed}.tiff`, fsRead(tiffPath));
          } catch { console.warn("TIFF missing for", seed); }
          try {
            zip.file(`glitch_${seed}_metadata.txt`, new TextDecoder().decode(fsRead(metaPath)));
          } catch { console.warn("Meta missing for", seed); }

          zip.generateAsync({ type: "blob" }).then(blob => {
            downloadBytes(blob, `glitch_${seed}.zip`, "application/zip");
          });
        } catch (err) {
          console.error("ZIP build failed:", err);
        }
      };

      actions.appendChild(btnPng);
      actions.appendChild(btnZip);
      overlay.appendChild(seedLabel);
      overlay.appendChild(actions);

      card.appendChild(img);
      card.appendChild(overlay);
      gallery.appendChild(card);
    });

    if (files.length === 0) gallery.innerHTML = "(no PNGs found)";
  } catch (err) {
    console.error("⚠️ Gallery load error:", err);
    gallery.innerHTML = `<span style="color:red">${err}</span>`;
  }
}



function fsRead(path) {
  // Returns Uint8Array from Pyodide FS
  return pyodide.FS.readFile(path);
}

function downloadBytes(bytes, filename, mime) {
  const blob = new Blob([bytes], { type: mime || "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function stemOf(name) {
  const lastDot = name.lastIndexOf(".");
  return lastDot >= 0 ? name.slice(0, lastDot) : name;
}

// From file name like "glitch_1234.png" → 1234
function seedFromFilename(file) {
  // supports "glitch_<seed>.png" or "glitch_<seed>_<anything>.png"
  const m = file.match(/^glitch_(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}