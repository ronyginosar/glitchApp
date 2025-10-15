let pyodide = null;

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

async function runGlitching(file, filename, variantCount, seedBase) {
  const buf = new Uint8Array(await file.arrayBuffer());
  pyodide.FS.writeFile("input.tiff", buf);
  console.log("📥 File written:", filename);

  const code = `
from glitch_main import handle_file_upload
with open("input.tiff", "rb") as f:
    data = f.read()
results = handle_file_upload(data, "${filename}", ${seedBase}, ${variantCount})
globals()["results"] = results
`;
  await pyodide.runPythonAsync(code);

  const results = pyodide.globals.get("results").toJs();
  console.log("✅ Python returned:", results);
  return results;
}

window.addEventListener("DOMContentLoaded", async () => {
  const dropzone = document.getElementById("dropzone");
  const button = document.getElementById("glitchButton");
  const log = document.getElementById("log");
  let uploadedFile = null;

  dropzone.addEventListener("dragover", e => e.preventDefault());
  dropzone.addEventListener("drop", e => {
    e.preventDefault();
    uploadedFile = e.dataTransfer.files[0];
    dropzone.textContent = `Loaded: ${uploadedFile.name}`;
    console.log("📁 Dropped:", uploadedFile.name);
  });

  button.addEventListener("click", async () => {
    if (!uploadedFile) return alert("Please drop a file first.");
    log.textContent = "⏳ Running glitch…";
    const results = await runGlitching(uploadedFile, uploadedFile.name, 3, Math.floor(Math.random()*9999));
    log.textContent = JSON.stringify(results, null, 2);
    console.log("✅ Done. Outputs in /outputs folder");
    console.log("🗂️ outputs:", pyodide.FS.readdir("outputs"));
  });

  await initPyodide();
});

// === Simple Pyodide FS Explorer ===

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

document.getElementById("refreshFS").addEventListener("click", () => renderFileTree());
