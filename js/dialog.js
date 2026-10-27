// ==============================================================================
// SYSTÈME UNIVERSEL DE FENÊTRES MODALES & ALERTES (CLUB IAA FSAN NADOR)
// Remplace toutes les alertes et confirmations natives du navigateur
// Bouton Fermer explicite, croix de fermeture, fermeture au clic extérieur et touche Échap
// ==============================================================================

const CIAA_DIALOG = (() => {
  let alertOverlay = null;
  let confirmOverlay = null;

  function ensureContainers() {
    if (!document.body) return;

    // 1. Conteneur Modale d'Alerte / Notification (Succès, Info, Erreur)
    if (!alertOverlay) {
      alertOverlay = document.createElement("div");
      alertOverlay.id = "ciaa-dialog-alert-overlay";
      alertOverlay.className = "ciaa-dialog-backdrop";
      alertOverlay.style.display = "none";
      alertOverlay.setAttribute("role", "dialog");
      alertOverlay.setAttribute("aria-modal", "true");
      alertOverlay.innerHTML = `
        <div class="ciaa-dialog-box">
          <button type="button" class="ciaa-dialog-top-close" id="ciaa-dialog-alert-top-close" aria-label="Fermer la fenêtre" title="Fermer">&times;</button>
          <div class="ciaa-dialog-icon-wrapper" id="ciaa-dialog-alert-icon">ℹ️</div>
          <h3 class="ciaa-dialog-title" id="ciaa-dialog-alert-title">Information</h3>
          <p class="ciaa-dialog-message" id="ciaa-dialog-alert-msg"></p>
          <div class="ciaa-dialog-actions">
            <button type="button" class="ciaa-dialog-btn primary" id="ciaa-dialog-alert-ok">✕ Fermer</button>
          </div>
        </div>
      `;
      document.body.appendChild(alertOverlay);
    }

    // 2. Conteneur Modale de Confirmation
    if (!confirmOverlay) {
      confirmOverlay = document.createElement("div");
      confirmOverlay.id = "ciaa-dialog-confirm-overlay";
      confirmOverlay.className = "ciaa-dialog-backdrop";
      confirmOverlay.style.display = "none";
      confirmOverlay.setAttribute("role", "dialog");
      confirmOverlay.setAttribute("aria-modal", "true");
      confirmOverlay.innerHTML = `
        <div class="ciaa-dialog-box">
          <button type="button" class="ciaa-dialog-top-close" id="ciaa-dialog-confirm-top-close" aria-label="Fermer la fenêtre" title="Fermer">&times;</button>
          <div class="ciaa-dialog-icon-wrapper confirm">❓</div>
          <h3 class="ciaa-dialog-title" id="ciaa-dialog-confirm-title">Confirmation requise</h3>
          <p class="ciaa-dialog-message" id="ciaa-dialog-confirm-msg"></p>
          <div class="ciaa-dialog-actions">
            <button type="button" class="ciaa-dialog-btn secondary" id="ciaa-dialog-confirm-cancel">✕ Annuler</button>
            <button type="button" class="ciaa-dialog-btn primary danger" id="ciaa-dialog-confirm-ok">✓ Confirmer</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmOverlay);
    }
  }

  return {
    // Fenêtre d'alerte / succès avec bouton de fermeture explicite
    alert: (message, title = "Notification Club IAA", type = "info") => {
      return new Promise((resolve) => {
        ensureContainers();
        const msgEl = document.getElementById("ciaa-dialog-alert-msg");
        const titleEl = document.getElementById("ciaa-dialog-alert-title");
        const iconEl = document.getElementById("ciaa-dialog-alert-icon");
        const okBtn = document.getElementById("ciaa-dialog-alert-ok");
        const topCloseBtn = document.getElementById("ciaa-dialog-alert-top-close");

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;

        // Configuration visuelle du type (succès, erreur, info)
        const isSuccess = type === "success" || message.includes("succès") || message.includes("validé") || title.includes("Succès") || title.includes("Publié") || title.includes("Actualisé") || title.includes("Enregistré");
        const isError = type === "error" || message.includes("Erreur") || message.includes("refusé") || message.includes("Impossible");

        if (iconEl) {
          if (isSuccess) {
            iconEl.textContent = "✓";
            iconEl.className = "ciaa-dialog-icon-wrapper success";
          } else if (isError) {
            iconEl.textContent = "✕";
            iconEl.className = "ciaa-dialog-icon-wrapper error";
          } else {
            iconEl.textContent = "ℹ️";
            iconEl.className = "ciaa-dialog-icon-wrapper info";
          }
        }

        if (okBtn) {
          okBtn.textContent = "✕ Fermer";
          okBtn.className = isSuccess ? "ciaa-dialog-btn primary success" : (isError ? "ciaa-dialog-btn primary danger" : "ciaa-dialog-btn primary");
        }

        alertOverlay.style.display = "flex";
        if (okBtn) okBtn.focus();

        const closeAlert = () => {
          alertOverlay.style.display = "none";
          cleanup();
          resolve(true);
        };

        const handleOverlayClick = (e) => {
          if (e.target === alertOverlay) closeAlert();
        };

        const handleKeyDown = (e) => {
          if (e.key === "Escape" || e.key === "Enter") closeAlert();
        };

        const cleanup = () => {
          if (okBtn) okBtn.removeEventListener("click", closeAlert);
          if (topCloseBtn) topCloseBtn.removeEventListener("click", closeAlert);
          alertOverlay.removeEventListener("click", handleOverlayClick);
          document.removeEventListener("keydown", handleKeyDown);
        };

        if (okBtn) okBtn.addEventListener("click", closeAlert);
        if (topCloseBtn) topCloseBtn.addEventListener("click", closeAlert);
        alertOverlay.addEventListener("click", handleOverlayClick);
        document.addEventListener("keydown", handleKeyDown);
      });
    },

    // Fenêtre de confirmation (Annuler / Confirmer)
    confirm: (message, title = "Confirmation requise") => {
      return new Promise((resolve) => {
        ensureContainers();
        const msgEl = document.getElementById("ciaa-dialog-confirm-msg");
        const titleEl = document.getElementById("ciaa-dialog-confirm-title");
        const okBtn = document.getElementById("ciaa-dialog-confirm-ok");
        const cancelBtn = document.getElementById("ciaa-dialog-confirm-cancel");
        const topCloseBtn = document.getElementById("ciaa-dialog-confirm-top-close");

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;

        confirmOverlay.style.display = "flex";
        if (okBtn) okBtn.focus();

        const handleOk = () => {
          confirmOverlay.style.display = "none";
          cleanup();
          resolve(true);
        };

        const handleCancel = () => {
          confirmOverlay.style.display = "none";
          cleanup();
          resolve(false);
        };

        const handleOverlayClick = (e) => {
          if (e.target === confirmOverlay) handleCancel();
        };

        const handleKeyDown = (e) => {
          if (e.key === "Escape") handleCancel();
          if (e.key === "Enter") handleOk();
        };

        const cleanup = () => {
          if (okBtn) okBtn.removeEventListener("click", handleOk);
          if (cancelBtn) cancelBtn.removeEventListener("click", handleCancel);
          if (topCloseBtn) topCloseBtn.removeEventListener("click", handleCancel);
          confirmOverlay.removeEventListener("click", handleOverlayClick);
          document.removeEventListener("keydown", handleKeyDown);
        };

        if (okBtn) okBtn.addEventListener("click", handleOk);
        if (cancelBtn) cancelBtn.addEventListener("click", handleCancel);
        if (topCloseBtn) topCloseBtn.addEventListener("click", handleCancel);
        confirmOverlay.addEventListener("click", handleOverlayClick);
        document.addEventListener("keydown", handleKeyDown);
      });
    }
  };
})();

// Redirection globale des alert() et confirm() du navigateur vers nos modales avec bouton Fermer
if (typeof window !== "undefined") {
  window.ciaaAlert = (msg, title, type) => CIAA_DIALOG.alert(msg, title, type);
  window.ciaaConfirm = (msg, title) => CIAA_DIALOG.confirm(msg, title);
  window.alert = (msg) => CIAA_DIALOG.alert(msg, "Club IA & Applications", "info");
  window.confirm = (msg) => CIAA_DIALOG.confirm(msg, "Confirmation requise");
}