// Logique de la page Annonces & Sujets de Projets à Construire (CIAA)

// 1. Liste des Sujets de Projets à Réaliser (LE CŒUR DE LA PAGE)
let currentSujetFilter = "all";
let sujetSearchKeyword = "";
let selectedSujetForModal = null;

// Rendu des Sujets de Projets
function renderSujets() {
  const container = document.getElementById("sujets-grid-container");
  const countEl = document.getElementById("sujets-count-display");
  if (!container) return;

  const allSujetsList = CIAA_STORE.getSujets()
    .filter(s => ["approved", "in_progress", "completed"].includes(s.status));

  const filtered = allSujetsList.filter(s => {
    const matchesCategory = (currentSujetFilter === "all") || (s.category === currentSujetFilter);
    const text = (s.title + " " + s.description + " " + (s.targetMaster || "") + " " + (s.technologies || []).join(" ")).toLowerCase();
    const matchesSearch = !sujetSearchKeyword || text.includes(sujetSearchKeyword.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (countEl) {
    countEl.textContent = `${filtered.length} sujet(s) disponible(s)`;
  }

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;background:#fff;border-radius:16px;border:1px dashed var(--line)">
        <h3>Aucun sujet trouvé pour cette sélection</h3>
        <p style="color:var(--muted)">Essayez de modifier votre mot-clé ou réinitialisez le filtre par domaine.</p>
        <button class="btn ghost" onclick="resetSujetFilters()">Voir tous les sujets</button>
      </div>
    `;
    return;
  }

  filtered.forEach(s => {
    const card = document.createElement("article");
    card.className = "sujet-card";

    const techPills = (s.technologies || []).map(t => `<span>${t}</span>`).join("");
    const statusLabels = {
      approved: "Candidatures ouvertes",
      in_progress: "En cours",
      completed: "Terminé"
    };

    card.innerHTML = `
      <div class="sujet-top-row">
        <span class="sujet-status-badge ${s.status}">${statusLabels[s.status] || s.status}</span>
        <span class="sujet-target-master">${s.targetMaster}</span>
      </div>
      <h3>${s.title}</h3>
      <p class="sujet-desc">${s.description}</p>
      
      <div class="sujet-tech-tags">
        ${techPills}
      </div>

      <div class="sujet-meta-info">
        ${s.teamSize ? `<span>Équipe : <strong>${s.teamSize}</strong></span>` : ""}
        ${s.targetMaster ? `<span>Master : <strong>${s.targetMaster}</strong></span>` : ""}
      </div>

      <div class="sujet-actions">
        <button class="btn-apply-sujet" type="button">
          🚀 Postuler à ce sujet
        </button>
        <button class="btn-details-sujet" type="button">
          Cahier des charges
        </button>
      </div>
    `;

    // Événements boutons

	// NOTE: This doesn't work
	// const closeBtn = card.querySelector('modal-close-btn')

	// if (closeBtn) {
    //   closeBtn.onclick = () => closeAllModals(s);
    // }

    const applyBtn = card.querySelector(".btn-apply-sujet");
    if (applyBtn) {
      applyBtn.onclick = () => openApplyModal(s);
    }

    const detailsBtn = card.querySelector(".btn-details-sujet");
    if (detailsBtn) {
      detailsBtn.onclick = () => openCahierModal(s);
    }

    container.appendChild(card);
  });
}

// Rendu des Annonces & News du club
// Modale Postuler à un sujet
function openApplyModal(sujet) {
  selectedSujetForModal = sujet;
  const modal = document.getElementById("apply-modal");
  if (!modal) return;

  document.getElementById("apply-modal-title").textContent = `Postuler au sujet : ${sujet.title}`;
  document.getElementById("apply-modal-sub").textContent = `Équipe requise : ${sujet.teamSize} · Cible : ${sujet.targetMaster}`;
  document.getElementById("apply-form").reset();
  document.getElementById("apply-status-msg").textContent = "";

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Modale Cahier des charges
function openCahierModal(sujet) {
  const modal = document.getElementById("cahier-modal");
  if (!modal) return;

  document.getElementById("cahier-modal-title").textContent = sujet.title;
  document.getElementById("cahier-modal-desc").textContent = sujet.description;
  document.getElementById("cahier-modal-deliverables").textContent = "";
  document.getElementById("cahier-modal-details").innerText = sujet.cahierDesCharges || sujet.description || "";
  document.getElementById("cahier-modal-techs").innerHTML = (sujet.technologies || []).map(t => `<span class="mod-pill">${t}</span>`).join(" ");

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

// Modale Proposer un nouveau sujet
function openProposeModal() {
  const modal = document.getElementById("propose-modal");
  if (!modal) return;
  document.getElementById("propose-form").reset();
  document.getElementById("propose-status-msg").textContent = "";
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach(m => m.classList.remove("active"));
  document.body.style.overflow = "";
}

function resetSujetFilters() {
  currentSujetFilter = "all";
  sujetSearchKeyword = "";
  const input = document.getElementById("sujet-search-input");
  if (input) input.value = "";
  document.querySelectorAll(".sujet-pill-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === "all");
  });
  renderSujets();
}

// Initialisation globale
document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;
  renderSujets();

  // Filtres thématiques pour sujets
  document.querySelectorAll(".sujet-pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sujet-pill-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSujetFilter = btn.dataset.cat;
      renderSujets();
    });
  });

  // Recherche textuelle pour sujets
  const searchInput = document.getElementById("sujet-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      sujetSearchKeyword = e.target.value.trim();
      renderSujets();
    });
  }

  // Bouton Proposer une idée de projet
  const proposeBtn = document.getElementById("btn-open-propose-modal");
  if (proposeBtn) {
    proposeBtn.addEventListener("click", openProposeModal);
  }

  // Soumission formulaire de candidature
  const applyForm = document.getElementById("apply-form");
  if (applyForm) {
    applyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById("apply-status-msg");
      statusEl.className = "modal-status-msg";
      statusEl.textContent = "Envoi en cours...";
      try {
        const firstName = document.getElementById("candidat-prenom").value.trim();
        const lastName = document.getElementById("candidat-nom").value.trim();
        const email = document.getElementById("candidat-email").value.trim();
        const master = document.getElementById("candidat-master").value;
        const teammate = document.getElementById("candidat-binome").value.trim();
        const motivation = document.getElementById("candidat-message").value.trim();
        await CIAA_STORE.addMessage({
          senderName: `${firstName} ${lastName}`,
          senderEmail: email,
          senderRole: "Candidature à un sujet",
          subject: `Candidature au sujet : ${selectedSujetForModal.title}`,
          message: [
            `Sujet ID : ${selectedSujetForModal.id}`,
            `Master : ${master}`,
            teammate ? `Coéquipier : ${teammate}` : "",
            motivation
          ].filter(Boolean).join("\n")
        });
        statusEl.className = "modal-status-msg success";
        statusEl.textContent = "Votre candidature a été envoyée.";
        setTimeout(closeAllModals, 2200);
      } catch (error) {
        statusEl.className = "modal-status-msg error";
        statusEl.textContent = `Échec de l'envoi : ${error.message}`;
      }
    });
  }

  // Soumission formulaire de proposition d'un nouveau sujet
  const proposeForm = document.getElementById("propose-form");
  if (proposeForm) {
    proposeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const statusEl = document.getElementById("propose-status-msg");

      const title = document.getElementById("propose-titre").value.trim();
      const category = document.getElementById("propose-cat").value;
      const targetMaster = document.getElementById("propose-master").value;
      const description = document.getElementById("propose-desc").value.trim();
      const techsStr = document.getElementById("propose-techs").value.trim();
      const email = document.getElementById("propose-email").value.trim();

      const currentUser = typeof CIAA_STORE !== "undefined" ? CIAA_STORE.getCurrentUser() : null;

      try {
        await CIAA_STORE.addSujet({
          title,
          category,
          description,
          targetMaster,
          technologies: techsStr ? techsStr.split(",").map(t => t.trim()).filter(Boolean) : [],
          memberEmail: email,
          memberName: currentUser ? `${currentUser.prenom} ${currentUser.nom}` : email,
          status: "pending"
        });
        statusEl.className = "modal-status-msg success";
        statusEl.textContent = "Votre proposition de sujet a été envoyée pour validation.";
        setTimeout(closeAllModals, 3000);
      } catch (error) {
        statusEl.className = "modal-status-msg error";
        statusEl.textContent = `Échec de l'envoi : ${error.message}`;
      }
    });
  }

  // Session Navbar
  const currentUser = typeof CIAA_STORE !== "undefined" ? CIAA_STORE.getCurrentUser() : null;
  const loginLink = document.querySelector("#login-link");
  const signupLink = document.querySelector("#signup-link");
  const profileLink = document.querySelector("#profile-link");
  const dashLink = document.querySelector("#dash-link");
  const logoutBtn = document.querySelector("#logout-btn");

  CIAA_STORE.syncNavigation();
});
