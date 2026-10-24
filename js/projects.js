// Gestion et affichage des projets CIAA (Supabase + Filtres + Recherche)

const SAMPLE_PROJECTS = [
  {
    id: "sample-1",
    title: "Détection d'Anomalies par Vision Artificielle en Temps Réel",
    description: "Système industriel d'inspection qualité automatisée utilisant YOLOv8 et OpenCV pour repérer les défauts de fabrication sur une ligne de production.",
    category: "vision",
    tags: ["YOLOv8", "Computer Vision", "PyTorch", "OpenCV"],
    link: "https://github.com",
    image_url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
    featured: true,
    team: [
      { name: "Youssef El Amrani", linkedin: "youssef-elamrani" },
      { name: "Salma Benali", linkedin: "salma-benali" }
    ]
  },
  {
    id: "sample-2",
    title: "Modèle LLM pour l'Analyse de Sentiments en Darija & Arabe",
    description: "Fine-tuning d'un modèle RoBERTa/AraBERT sur des commentaires et avis clients en dialecte marocain (Darija) avec interface Streamlit.",
    category: "nlp",
    tags: ["NLP", "HuggingFace", "Transformers", "Darija"],
    link: "https://github.com",
    image_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    featured: true,
    team: [
      { name: "Karim Mansouri", linkedin: "karim-mansouri" }
    ]
  },
  {
    id: "sample-3",
    title: "Segmentation Automatisée de Tumeurs Cérébrales (IRM)",
    description: "Modèle U-Net 3D entraîné sur le dataset BraTS pour assister les radiologues dans la détection précoce des gliomes cérébraux.",
    category: "ml",
    tags: ["Deep Learning", "Santé / IRM", "U-Net", "PyTorch"],
    link: "https://github.com",
    image_url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
    featured: false,
    team: [
      { name: "Fatima Zahra Tahiri", linkedin: "fz-tahiri" },
      { name: "Omar Chraibi", linkedin: "omar-chraibi" }
    ]
  },
  {
    id: "sample-4",
    title: "Station Météo Intelligente & Prédiction Agricole IoT",
    description: "Capteurs environnementaux connectés en LoRaWAN et algorithmes XGBoost pour prédire les besoins en irrigation dans la région de l'Oriental.",
    category: "iot",
    tags: ["IoT", "Edge AI", "XGBoost", "Agriculture 4.0"],
    link: "https://github.com",
    image_url: "https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&w=800&q=80",
    featured: false,
    team: [
      { name: "Bilal Kaddouri", linkedin: "bilal-kaddouri" }
    ]
  }
];

let allProjects = [];
let currentFilter = "all";
let searchKeyword = "";

const SUPABASE_URL = 'https://dwtizibjpkdtcceiggxf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MeOXYq_SwsXx-IkyPhGqqQ_jGlxMeS5';

async function fetchProjectsFromSupabase() {
  if (typeof supabase === 'undefined') {
    return SAMPLE_PROJECTS;
  }

  const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sync auth links
  db.auth.onAuthStateChange((_event, session) => {
    const showAuthLinks = !session;
    const loginLink = document.querySelector("#login-link");
    const signupLink = document.querySelector("#signup-link");
    const logoutBtn = document.querySelector("#logout-btn");
    if (loginLink) loginLink.hidden = !showAuthLinks;
    if (signupLink) signupLink.hidden = !showAuthLinks;
    if (logoutBtn) logoutBtn.hidden = showAuthLinks;
  });

  const logoutBtn = document.querySelector("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await db.auth.signOut();
      window.location.reload();
    });
  }

  try {
    const { data, error } = await db
      .from('projects')
      .select('*, users(nom, prenom, linkedin_username)')
      .eq('state', 1)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      console.info("Utilisation des projets d'exemple (base vide ou indisponible)");
      return SAMPLE_PROJECTS;
    }

    // Convert database rows to standardized format
    const dbProjects = data.map(item => {
      const users = Array.isArray(item.users) ? item.users : (item.users ? [item.users] : []);
      const team = users.filter(Boolean).map(u => ({
        name: [u.prenom, u.nom].filter(Boolean).join(" ").trim(),
        linkedin: u.linkedin_username?.trim()
      })).filter(u => u.name);

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        category: (item.description + " " + item.title).toLowerCase().includes("vision") ? "vision" :
                  (item.description + " " + item.title).toLowerCase().includes("nlp") ? "nlp" : "ml",
        tags: ["IA", "Projet CIAA"],
        link: item.link,
        image_url: item.image_url,
        featured: !!item.featured,
        team
      };
    });

    // Merge with sample projects to ensure a full catalog
    return [...dbProjects, ...SAMPLE_PROJECTS];
  } catch (err) {
    console.warn("Erreur Supabase:", err);
    return SAMPLE_PROJECTS;
  }
}

function renderGallery() {
  const container = document.getElementById("projects-gallery");
  if (!container) return;

  const filtered = allProjects.filter(p => {
    const matchesFilter = (currentFilter === "all") || (p.category === currentFilter);
    const text = (p.title + " " + p.description + " " + (p.tags || []).join(" ")).toLowerCase();
    const matchesSearch = !searchKeyword || text.includes(searchKeyword.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-gallery">
        <h3>Aucun projet trouvé</h3>
        <p>Essayez d'ajuster vos critères de recherche ou sélectionnez une autre catégorie.</p>
        <button class="btn ghost" onclick="resetFilters()">Réinitialiser les filtres</button>
      </div>
    `;
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement("article");
    card.className = "project-card";

    // Image ou fallback
    const thumbHtml = p.image_url 
      ? `<img src="${p.image_url}" alt="${p.title}" loading="lazy">` 
      : `<span class="no-image">CIAA</span>`;

    // Featured badge
    const featuredHtml = p.featured ? `<div class="featured-pill">★ En vedette</div>` : "";

    // Tags
    const tagsHtml = (p.tags || []).map(t => `<span>${t}</span>`).join("");

    // Équipe
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

    // Code link
    const linkHtml = p.link 
      ? `<a class="btn-code" href="${p.link}" target="_blank" rel="noopener noreferrer">Voir le code sur GitHub &rarr;</a>` 
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
          ${linkHtml}
        </div>
      </div>
    `;

    container.appendChild(card);
  });
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
  allProjects = await fetchProjectsFromSupabase();
  renderGallery();

  // Filtres
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      renderGallery();
    });
  });

  // Recherche
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchKeyword = e.target.value.trim();
      renderGallery();
    });
  }
});
