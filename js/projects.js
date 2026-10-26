// Logique de la page individuelle Projets (Tous les projets, filtres, recherche et modale de détails)
// Synchronisé avec le Dashboard via CIAA_STORE

let allProjects = [];
let currentFilter = "all";
let searchKeyword = "";

async function loadAllApprovedProjects() {
  await CIAA_STORE.ready;
  return await CIAA_BACKEND.getProjects(1);
}

function renderGallery() {
  const container = document.getElementById("projects-gallery");
  const countEl = document.getElementById("projects-count-display");
  if (!container) return;

  const filtered = allProjects.filter(p => {
    const matchesFilter = (currentFilter === "all") || (p.category === currentFilter);
    const text = (p.title + " " + p.description + " " + (p.tags || []).join(" ")).toLowerCase();
    const matchesSearch = !searchKeyword || text.includes(searchKeyword.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (countEl) {
    countEl.textContent = `${filtered.length} projet(s) validé(s) et publié(s)`;
  }

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-gallery">
        <h3>Aucun projet ne correspond à vos critères</h3>
        <p>Modifiez votre recherche par mot-clé ou sélectionnez une autre catégorie thématique.</p>
        <button class="btn ghost" onclick="resetFilters()">Réinitialiser les filtres</button>
      </div>
    `;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("article");
    card.className = "project-card";

    const thumbHtml = p.image_url 
      ? `<img src="${p.image_url}" alt="${p.title}" loading="lazy">` 
      : `<span class="no-image">CIAA</span>`;

    const featuredHtml = p.featured ? `<div class="featured-pill">★ Top 3 Accueil</div>` : "";
    const tagsHtml = (p.tags || []).map(t => `<span>${t}</span>`).join("");

    let teamHtml = "";
    if (p.team && p.team.length > 0) {
      const members = p.team.map(m => {
        if (m.linkedin) {
          return `<a href="https://www.linkedin.com/in/${encodeURIComponent(m.linkedin)}" target="_blank" rel="noopener noreferrer">${m.name}</a>`;
        }
        return `<span>${m.name}</span>`;
      }).join(", ");
      teamHtml = `<div class="project-team"><strong>Équipe :</strong> ${members}</div>`;
    }

    const codeHtml = p.link 
      ? `<a class="btn-code" href="${p.link}" target="_blank" rel="noopener noreferrer">Code &rarr;</a>` 
      : "";

    card.innerHTML = `
      <div class="project-thumbnail">
        ${thumbHtml}
        ${featuredHtml}
      </div>
      <div class="project-content">
        <h3>${p.title}</h3>
        <p class="project-desc">${p.description}</p>
        <div class="project-tags">
          ${tagsHtml}
        </div>
        ${teamHtml}
        <div class="project-footer">
          <button class="btn-details" type="button">Voir les détails</button>
          ${codeHtml}
        </div>
      </div>
    `;

    const detailsBtn = card.querySelector(".btn-details");
    if (detailsBtn) {
      detailsBtn.addEventListener("click", () => openProjectModal(p));
    }

    container.appendChild(card);
  });
}

// Gestion de la modale de détails
function openProjectModal(project) {
  const modal = document.getElementById("project-modal");
  if (!modal) return;

  const modalImg = document.getElementById("modal-img");
  const modalTitle = document.getElementById("modal-title");
  const modalDesc = document.getElementById("modal-desc");
  const modalTags = document.getElementById("modal-tags");
  const modalTeam = document.getElementById("modal-team");
  const modalGithub = document.getElementById("modal-github");

  if (modalImg) {
    if (project.image_url) {
      modalImg.src = project.image_url;
      modalImg.hidden = false;
    } else {
      modalImg.removeAttribute("src");
      modalImg.hidden = true;
    }
  }
  if (modalTitle) modalTitle.textContent = project.title;
  if (modalDesc) modalDesc.textContent = project.description;
  if (modalTags) {
    modalTags.innerHTML = (project.tags || []).map(t => `<span>${t}</span>`).join("");
  }
  if (modalTeam) {
    if (project.team && project.team.length > 0) {
      modalTeam.innerHTML = project.team.map(m => `
        <span style="display:inline-block;margin-right:12px">
          👤 ${m.name} ${m.linkedin ? `<a href="https://www.linkedin.com/in/${encodeURIComponent(m.linkedin)}" target="_blank" style="color:var(--blue)">[LinkedIn]</a>` : ''}
        </span>
      `).join("");
    } else {
      modalTeam.textContent = "Aucun membre renseigné.";
    }
  }

  if (modalGithub) {
    if (project.link) {
      modalGithub.href = project.link;
      modalGithub.style.display = "inline-flex";
    } else {
      modalGithub.style.display = "none";
    }
  }

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeProjectModal() {
  const modal = document.getElementById("project-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
  }
}

function resetFilters() {
  currentFilter = "all";
  searchKeyword = "";
  const searchInput = document.getElementById("search-input");
  if (searchInput) searchInput.value = "";
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === "all");
  });
  renderGallery();
}

document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;
  try {
    allProjects = await loadAllApprovedProjects();
  } catch (error) {
    console.error("[projects.js] Impossible de charger les projets Supabase :", error);
    const gallery = document.getElementById("projects-gallery");
    if (gallery) {
      const message = document.createElement("p");
      message.setAttribute("role", "alert");
      message.textContent = `Impossible de charger les projets depuis Supabase : ${error.message}`;
      gallery.replaceChildren(message);
    }
    CIAA_STORE.syncNavigation();
    return;
  }
  renderGallery();

  // Boutons de filtres
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderGallery();
    });
  });

  // Champ de recherche
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchKeyword = e.target.value.trim();
      renderGallery();
    });
  }

  // Fermeture modale
  const modalClose = document.getElementById("modal-close-btn");
  const modalOverlay = document.getElementById("project-modal");
  if (modalClose) modalClose.addEventListener("click", closeProjectModal);
  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeProjectModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeProjectModal();
  });

  CIAA_STORE.syncNavigation();
});
