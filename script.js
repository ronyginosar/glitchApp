document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  const glitchButton = document.getElementById('glitchButton');
  const exportAllBtn = document.getElementById('exportAll');
  const gallery = document.getElementById('gallery');
  let uploadedFile = null;

  dropzone.addEventListener('dragover', e => {
    e.preventDefault();
    dropzone.classList.add('hover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('hover');
  });

  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('hover');
    const file = e.dataTransfer.files[0];
    if (file) {
      uploadedFile = file;
      dropzone.textContent = `Loaded: ${file.name}`;
    }
  });

  glitchButton.addEventListener('click', () => {
    if (!uploadedFile) {
      alert("Please drop a TIFF image first.");
      return;
    }

    // In real implementation: send to backend or WASM processor
    generateFakeGlitches();
  });

  exportAllBtn.addEventListener('click', () => {
    alert("TODO: bundle all and export as .zip");
  });

  function generateFakeGlitches() {
    gallery.innerHTML = '';
    const num = parseInt(document.getElementById('variantCount').value);
    for (let i = 0; i < num; i++) {
      const preview = document.createElement('div');
      preview.className = 'preview';
      const img = document.createElement('img');
      img.src = `https://picsum.photos/seed/${Math.random()}/200/200`; // Placeholder image
      const meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = `Chunk ${i + 1}: byte range ???–???`;
      preview.appendChild(img);
      preview.appendChild(meta);
      gallery.appendChild(preview);
    }
  }
});
