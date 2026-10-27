// Utilitaire universel pour gérer l'upload d'images depuis l'appareil local (PC/téléphone)
// Conversion automatique en Base64 Data URL, drag & drop et prévisualisation instantanée

const CIAA_IMAGE_UPLOAD = {
  /**
   * Initialise un champ d'upload de fichier image depuis l'appareil
   * @param {Object} config
   * @param {string} config.inputId - ID du champ input[type="file"]
   * @param {string} config.dropzoneId - ID du conteneur cliquable / dropzone
   * @param {string} config.previewBoxId - ID du conteneur de prévisualisation
   * @param {string} config.previewImgId - ID de la balise <img> de prévisualisation
   * @param {string} [config.nameId] - ID de l'élément pour le nom de fichier
   * @param {string} [config.sizeId] - ID de l'élément pour la taille du fichier
   * @param {string} [config.removeBtnId] - ID du bouton supprimer l'image
   * @param {Function} [config.onImageLoaded] - Callback appelée avec (base64Data, file)
   */
  init(config) {
    const input = document.getElementById(config.inputId);
    const dropzone = document.getElementById(config.dropzoneId);
    const previewBox = document.getElementById(config.previewBoxId);
    const previewImg = document.getElementById(config.previewImgId);
    const nameEl = config.nameId ? document.getElementById(config.nameId) : null;
    const sizeEl = config.sizeId ? document.getElementById(config.sizeId) : null;
    const removeBtn = config.removeBtnId ? document.getElementById(config.removeBtnId) : null;

    let currentBase64 = null;

    if (!input) return { getBase64: () => currentBase64, setBase64: () => {}, reset: () => {} };

    // Formatage de la taille en Ko / Mo
    const formatSize = (bytes) => {
      if (bytes < 1024) return bytes + " octets";
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " Ko";
      return (bytes / 1048576).toFixed(2) + " Mo";
    };

    // Lecture du fichier sélectionné
    const handleFile = (file) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        if (typeof ciaaAlert === "function") {
          ciaaAlert("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP, GIF, SVG).", "Format Invalide", "error");
        } else {
          alert("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP, GIF, SVG).");
        }
        return;
      }

      // Limite raisonnable 5 Mo
      if (file.size > 5 * 1024 * 1024) {
        if (typeof ciaaAlert === "function") {
          ciaaAlert("L'image dépasse 5 Mo. Veuillez choisir une image plus légère.", "Fichier Trop Lourd", "error");
        } else {
          alert("L'image dépasse 5 Mo. Veuillez choisir une image plus légère.");
        }
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        currentBase64 = e.target.result;

        if (previewImg) {
          previewImg.src = currentBase64;
        }

        if (previewBox) {
          previewBox.classList.add("has-image");
        }

        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = formatSize(file.size);

        if (typeof config.onImageLoaded === "function") {
          config.onImageLoaded(currentBase64, file);
        }
      };

      reader.readAsDataURL(file);
    };

    // Écouteur input file
    input.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleFile(file);
    });

    // Support Drag & Drop si la dropzone existe
    if (dropzone) {
      ["dragenter", "dragover"].forEach(evtName => {
        dropzone.addEventListener(evtName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add("dragover");
        }, false);
      });

      ["dragleave", "drop"].forEach(evtName => {
        dropzone.addEventListener(evtName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove("dragover");
        }, false);
      });

      dropzone.addEventListener("drop", (e) => {
        const dt = e.dataTransfer;
        const file = dt && dt.files && dt.files[0];
        if (file) {
          handleFile(file);
          // Mettre à jour l'input pour cohérence
          try {
            input.files = dt.files;
          } catch (_) {}
        }
      });
    }

    // Bouton de suppression de l'image
    if (removeBtn) {
      removeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        currentBase64 = null;
        input.value = "";
        if (previewImg) previewImg.src = "";
        if (previewBox) previewBox.classList.remove("has-image");
        if (nameEl) nameEl.textContent = "";
        if (sizeEl) sizeEl.textContent = "";
        if (typeof config.onImageLoaded === "function") {
          config.onImageLoaded(null, null);
        }
      });
    }

    return {
      getBase64: () => currentBase64,
      setBase64: (dataUrl, fileName = "Image existante") => {
        currentBase64 = dataUrl;
        if (previewImg && dataUrl) previewImg.src = dataUrl;
        if (previewBox && dataUrl) previewBox.classList.add("has-image");
        if (nameEl && dataUrl) nameEl.textContent = fileName;
      },
      reset: () => {
        currentBase64 = null;
        input.value = "";
        if (previewImg) previewImg.src = "";
        if (previewBox) previewBox.classList.remove("has-image");
        if (nameEl) nameEl.textContent = "";
        if (sizeEl) sizeEl.textContent = "";
      }
    };
  }
};
