// Logique interactive de la plateforme Apprendre (Coursera-like)

const COURSES_DATA = {
  ml: {
    id: "ml",
    title: "Machine Learning de A à Z : Théorie & Pratique",
    badge: "Machine Learning",
    level: "Débutant à Intermédiaire",
    totalDuration: "8h 45min",
    modules: [
      {
        title: "Module 1 : Introduction & Fondements",
        badge: "3 leçons",
        lessons: [
          {
            id: "ml-1",
            title: "1. Qu'est-ce que le Machine Learning ? (Supervisé vs Non-supervisé)",
            duration: "18 min",
            youtubeId: "ukzFI9rgwfU", // Machine Learning course intro
            instructor: "Dr. Andrew Ng / Stanford Online",
            instructorRole: "Pionnier en IA & Fondateur Coursera",
            description: "Introduction claire aux concepts clés de l'apprentissage automatique : classification, régression, regroupement (clustering) et les étapes du pipeline de données.",
            resources: [
              { name: "Slides du cours (PDF)", url: "https://github.com" },
              { name: "Notebook Google Colab - Introduction", url: "https://colab.research.google.com" },
              { name: "Cheat Sheet Scikit-Learn", url: "https://scikit-learn.org" }
            ],
            notes: "Points clés à retenir : La différence fondamentale entre programmation classique (règles + données = réponses) et Machine Learning (données + réponses = règles)."
          },
          {
            id: "ml-2",
            title: "2. Régression Linéaire & Descente de Gradient",
            duration: "24 min",
            youtubeId: "7ArmBVF2dCs",
            instructor: "StatQuest with Josh Starmer",
            instructorRole: "Spécialiste en vulgarisation IA & Stats",
            description: "Comprendre les mathématiques intuitives derrière la fonction de coût (MSE), le taux d'apprentissage (learning rate) et la descente de gradient.",
            resources: [
              { name: "Code Python : Régression from scratch", url: "https://github.com" },
              { name: "Visualisation interactive de la Descente de Gradient", url: "https://colab.research.google.com" }
            ],
            notes: "Attention à bien normaliser vos variables explicatives (StandardScaler) pour accélérer la convergence de l'optimiseur."
          },
          {
            id: "ml-3",
            title: "3. Régression Logistique & Classification Binaire",
            duration: "20 min",
            youtubeId: "yIYKR4sgzI8",
            instructor: "StatQuest with Josh Starmer",
            instructorRole: "Spécialiste en vulgarisation IA & Stats",
            description: "Fonction Sigmoïde, log-odds, probabilités prédites et matrice de confusion.",
            resources: [
              { name: "TP : Détection de spams avec Scikit-Learn", url: "https://github.com" }
            ],
            notes: "La régression logistique sert à classifier, pas à prédire une valeur continue. Seuil par défaut = 0.5."
          }
        ]
      },
      {
        title: "Module 2 : Arbres de Décision & Méthodes d'Ensemble",
        badge: "2 leçons",
        lessons: [
          {
            id: "ml-4",
            title: "4. Arbres de Décision (Decision Trees) & Indice de Gini",
            duration: "22 min",
            youtubeId: "_L39rN6gz7Y",
            instructor: "StatQuest with Josh Starmer",
            instructorRole: "Spécialiste en vulgarisation IA & Stats",
            description: "Comment un arbre partitionne l'espace des caractéristiques, critère de Gini et entropie de Shannon.",
            resources: [
              { name: "Jupyter Notebook : Arbres et élagage", url: "https://colab.research.google.com" }
            ],
            notes: "Les arbres simples ont tendance au surapprentissage (overfitting) sans régularisation comme max_depth."
          },
          {
            id: "ml-5",
            title: "5. Random Forest & Gradient Boosting (XGBoost)",
            duration: "30 min",
            youtubeId: "J4Wdy0Wc_xQ",
            instructor: "StatQuest with Josh Starmer",
            instructorRole: "Spécialiste en vulgarisation IA & Stats",
            description: "Le bagging vs le boosting. Pourquoi Random Forest et XGBoost dominent les compétitions Kaggle sur données tabulaires.",
            resources: [
              { name: "Tutoriel XGBoost complet", url: "https://github.com" },
              { name: "Documentation XGBoost", url: "https://xgboost.readthedocs.io" }
            ],
            notes: "Bagging réduit la variance, Boosting réduit le biais."
          }
        ]
      },
      {
        title: "Module 3 : Évaluation & Déploiement",
        badge: "2 leçons",
        lessons: [
          {
            id: "ml-6",
            title: "6. Métriques d'évaluation : Précision, Rappel, F1-Score et ROC/AUC",
            duration: "25 min",
            youtubeId: "4jRBRDbJemM",
            instructor: "Dr. Andrew Ng",
            instructorRole: "DeepLearning.AI",
            description: "Pourquoi l'accuracy peut être trompeuse en cas de classes déséquilibrées (déséquilibre de données médicales ou détection de fraude).",
            resources: [
              { name: "Guide des métriques en Machine Learning", url: "https://scikit-learn.org" }
            ],
            notes: "Choisissez le Rappel si les faux négatifs sont critiques (diagnostic maladie), la Précision si les faux positifs sont coûteux."
          },
          {
            id: "ml-7",
            title: "7. Déployer un modèle avec FastAPI et Docker",
            duration: "35 min",
            youtubeId: "0RS9W8gH-8w",
            instructor: "FreeCodeCamp / TechLead",
            instructorRole: "Ingénieur MLOps",
            description: "Créer une API REST performante pour servir les prédictions d'un modèle ML entraîné.",
            resources: [
              { name: "Template repo FastAPI + Scikit-Learn", url: "https://github.com" },
              { name: "Dockerfile pour FastAPI", url: "https://docker.com" }
            ],
            notes: "Sauvegardez vos modèles avec joblib ou pickle et conteneurisez l'application pour garantir la reproductibilité."
          }
        ]
      }
    ]
  },

  dl: {
    id: "dl",
    title: "Deep Learning, CNN & Vision par Ordinateur",
    badge: "Deep Learning",
    level: "Intermédiaire à Avancé",
    totalDuration: "10h 15min",
    modules: [
      {
        title: "Module 1 : Réseaux de Neurones & PyTorch",
        badge: "3 leçons",
        lessons: [
          {
            id: "dl-1",
            title: "1. Qu'est-ce qu'un Réseau de Neurones Artificiel ? (Perceptron Multicouche)",
            duration: "26 min",
            youtubeId: "aircAruvnKk", // 3Blue1Brown Neural Networks
            instructor: "Grant Sanderson (3Blue1Brown)",
            instructorRole: "Mathématicien & Créateur de visualisations",
            description: "Visualisation intuitive et magistrale des couches, poids, biais et activations non-linéaires (ReLU, Sigmoid).",
            resources: [
              { name: "Visualisation 3Blue1Brown - Chapitre 1", url: "https://www.3blue1brown.com" },
              { name: "Guide PyTorch Tensors", url: "https://pytorch.org" }
            ],
            notes: "Une couche dense est simplement une multiplication matricielle suivie d'un ajout de biais et d'une non-linéarité."
          },
          {
            id: "dl-2",
            title: "2. Rétropropagation du Gradient (Backpropagation) pas à pas",
            duration: "22 min",
            youtubeId: "IHZwWFHWa-w",
            instructor: "Grant Sanderson (3Blue1Brown)",
            instructorRole: "Mathématicien & Créateur de visualisations",
            description: "Calcul différentiel, règle de dérivation en chaîne (chain rule) et ajustement des poids par descente de gradient.",
            resources: [
              { name: "Exercices de dérivation appliquée", url: "https://github.com" }
            ],
            notes: "L'algorithme de backpropagation calcule efficacement les gradients partiels grâce au graphe de calcul dynamique de PyTorch."
          },
          {
            id: "dl-3",
            title: "3. PyTorch Crash Course : Tenseurs, Autograd et Premier Modèle",
            duration: "40 min",
            youtubeId: "V_xro1bcAuA",
            instructor: "FreeCodeCamp / Daniel Bourke",
            instructorRole: "Machine Learning Engineer",
            description: "Prise en main de PyTorch : `nn.Module`, `optim.Adam`, `loss_fn`, et la boucle d'entraînement (training loop).",
            resources: [
              { name: "Notebook PyTorch débutant", url: "https://colab.research.google.com" }
            ],
            notes: "Pensez toujours à appeler optimizer.zero_grad() avant loss.backward() !"
          }
        ]
      },
      {
        title: "Module 2 : Vision par Ordinateur & CNN (Réseaux Convolutifs)",
        badge: "2 leçons",
        lessons: [
          {
            id: "dl-4",
            title: "4. Réseaux de Neurones Convolutifs (CNN) : Filtres, Pooling et Stride",
            duration: "32 min",
            youtubeId: "QzY57FaENXg",
            instructor: "Stanford University (CS231n)",
            instructorRole: "Fei-Fei Li / Andrej Karpathy",
            description: "Comment les filtres de convolution détectent les contours, textures et formes de haut niveau dans une image.",
            resources: [
              { name: "Visualisation CNN interactif", url: "https://poloclub.github.io/cnn-explainer/" }
            ],
            notes: "L'invariance par translation est le grand atout des convolutions par rapport aux réseaux denses (MLP)."
          },
          {
            id: "dl-5",
            title: "5. Détection d'Objets en temps réel avec YOLOv8",
            duration: "38 min",
            youtubeId: "m9fH9OWnNi8",
            instructor: "Ultralytics & Computer Vision Engineers",
            instructorRole: "Vision Artificielle Spécialiste",
            description: "Découverte de l'architecture YOLO (You Only Look Once), bounding boxes, IoU, NMS et fine-tuning sur dataset personnalisé.",
            resources: [
              { name: "Repo GitHub YOLOv8", url: "https://github.com/ultralytics/ultralytics" },
              { name: "Dataset Roboflow gratuit pour tester", url: "https://roboflow.com" }
            ],
            notes: "Idéal pour les projets d'étudiants en Master SDSI et MIATE pour la robotique et surveillance intelligente."
          }
        ]
      }
    ]
  },

  nlp: {
    id: "nlp",
    title: "NLP & LLMs : Des Transformers à ChatGPT & LangChain",
    badge: "NLP & LLMs",
    level: "Intermédiaire à Avancé",
    totalDuration: "7h 30min",
    modules: [
      {
        title: "Module 1 : L'Architecture Transformer",
        badge: "2 leçons",
        lessons: [
          {
            id: "nlp-1",
            title: "1. Attention is All You Need : Comprendre le Mécanisme d'Attention",
            duration: "30 min",
            youtubeId: "wjZofJX0v4U",
            instructor: "3Blue1Brown / Andrej Karpathy",
            instructorRole: "Co-fondateur OpenAI / Enseignant Stanford",
            description: "Pourquoi l'attention multi-têtes a révolutionné l'intelligence artificielle et supplanté les RNN/LSTM.",
            resources: [
              { name: "Papier original 'Attention is All You Need'", url: "https://arxiv.org/abs/1706.03762" },
              { name: "The Illustrated Transformer (Jay Alammar)", url: "https://jalammar.github.io/illustrated-transformer/" }
            ],
            notes: "Query, Key, Value : l'attention pondère l'importance de chaque mot par rapport à tous les autres mots de la phrase."
          },
          {
            id: "nlp-2",
            title: "2. Construire un GPT from scratch avec PyTorch",
            duration: "55 min",
            youtubeId: "kCc8FmEb1nY",
            instructor: "Andrej Karpathy",
            instructorRole: "Ex-Directeur AI Tesla, OpenAI",
            description: "Le tutoriel de référence mondiale : coder un mini modèle GPT, tokenisation BPE, auto-régression et génération de texte.",
            resources: [
              { name: "Repo nanoGPT (GitHub)", url: "https://github.com/karpathy/nanoGPT" },
              { name: "Google Colab nanoGPT", url: "https://colab.research.google.com" }
            ],
            notes: "La vidéo la plus enrichissante pour tout étudiant voulant comprendre les entrailles des LLMs."
          }
        ]
      },
      {
        title: "Module 2 : RAG & Applications avec LangChain",
        badge: "2 leçons",
        lessons: [
          {
            id: "nlp-3",
            title: "3. RAG (Retrieval-Augmented Generation) & Embeddings Vectoriels",
            duration: "28 min",
            youtubeId: "tcqEUSNCn8I",
            instructor: "Hugging Face / LangChain Community",
            instructorRole: "Spécialistes LLM & Recherche Vectorielle",
            description: "Connecter un LLM à vos propres documents PDF ou base de connaissances grâce aux Vector Databases (ChromaDB, FAISS).",
            resources: [
              { name: "Guide RAG HuggingFace", url: "https://huggingface.co" }
            ],
            notes: "Le RAG élimine les hallucinations en injectant le contexte vérifié directement dans le prompt de l'utilisateur."
          },
          {
            id: "nlp-4",
            title: "4. Construire un Agent IA avec LangChain et Python",
            duration: "35 min",
            youtubeId: "aywZrzNaKjs",
            instructor: "FreeCodeCamp / Patrick Loeber",
            instructorRole: "AI Engineer",
            description: "Création d'agents intelligents autonomes capables d'exécuter des outils (calculatrice, recherche web, base SQL).",
            resources: [
              { name: "Repo LangChain Agents", url: "https://github.com" }
            ],
            notes: "Un agent utilise le patron ReAct (Reasoning + Acting) pour décider quelle action entreprendre."
          }
        ]
      }
    ]
  }
};

let currentTrack = "ml";
let currentLesson = COURSES_DATA.ml.modules[0].lessons[0];
let completedLessons = new Set();

// Charger les leçons terminées depuis localStorage
function loadCompletedLessons() {
  try {
    const saved = localStorage.getItem("ciaa_completed_lessons");
    if (saved) {
      completedLessons = new Set(JSON.parse(saved));
    }
  } catch (e) {
    console.warn("Impossible d'accéder au localStorage", e);
  }
}

function saveCompletedLessons() {
  try {
    localStorage.setItem("ciaa_completed_lessons", JSON.stringify([...completedLessons]));
  } catch (e) {
    console.warn(e);
  }
}

// Mettre à jour l'affichage de la progression
function updateProgressBar() {
  const course = COURSES_DATA[currentTrack];
  let allCourseLessons = [];
  course.modules.forEach(m => allCourseLessons.push(...m.lessons));

  const total = allCourseLessons.length;
  let doneCount = 0;
  allCourseLessons.forEach(l => {
    if (completedLessons.has(l.id)) doneCount++;
  });

  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const barFill = document.getElementById("course-progress-fill");
  const countText = document.getElementById("course-progress-text");
  const percentText = document.getElementById("course-progress-percent");

  if (barFill) barFill.style.width = `${percent}%`;
  if (countText) countText.textContent = `${doneCount} / ${total} leçons terminées`;
  if (percentText) percentText.textContent = `${percent}%`;
}

// Rendre la liste du syllabus (modules & leçons)
function renderSyllabus() {
  const container = document.getElementById("modules-list");
  if (!container) return;

  const course = COURSES_DATA[currentTrack];
  container.innerHTML = "";

  course.modules.forEach((module, mIdx) => {
    const moduleBox = document.createElement("div");
    moduleBox.className = "module-box";

    const head = document.createElement("div");
    head.className = "module-head";
    head.innerHTML = `
      <span>${module.title}</span>
      <span class="badge">${module.badge}</span>
    `;
    moduleBox.appendChild(head);

    const ul = document.createElement("ul");
    ul.className = "lesson-list";

    module.lessons.forEach((lesson) => {
      const li = document.createElement("li");
      const isCurrent = lesson.id === currentLesson.id;
      const isDone = completedLessons.has(lesson.id);

      li.className = `lesson-item ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`;
      li.onclick = () => selectLesson(lesson);

      li.innerHTML = `
        <div class="lesson-info">
          <div class="lesson-icon">${isDone ? '✓' : (isCurrent ? '▶' : '•')}</div>
          <span class="lesson-title-text" title="${lesson.title}">${lesson.title}</span>
        </div>
        <span class="lesson-duration">${lesson.duration}</span>
      `;

      ul.appendChild(li);
    });

    moduleBox.appendChild(ul);
    container.appendChild(moduleBox);
  });

  updateProgressBar();
}

// Sélectionner une leçon et rafraîchir le player
function selectLesson(lesson) {
  currentLesson = lesson;

  // Iframe Youtube
  const player = document.getElementById("yt-player");
  if (player) {
    player.src = `https://www.youtube.com/embed/${lesson.youtubeId}?autoplay=1&rel=0`;
  }

  // Métadonnées
  const titleEl = document.getElementById("player-lesson-title");
  const trackBadge = document.getElementById("player-track-badge");
  const durationBadge = document.getElementById("player-duration-badge");
  const levelBadge = document.getElementById("player-level-badge");
  const instrName = document.getElementById("player-instructor-name");
  const instrRole = document.getElementById("player-instructor-role");
  const instrAvatar = document.getElementById("player-instructor-avatar");
  const descEl = document.getElementById("tab-desc-content");
  const notesEl = document.getElementById("tab-notes-content");
  const resList = document.getElementById("tab-resources-list");
  const markBtn = document.getElementById("btn-toggle-complete");

  if (titleEl) titleEl.textContent = lesson.title;
  if (trackBadge) trackBadge.textContent = COURSES_DATA[currentTrack].badge;
  if (durationBadge) durationBadge.textContent = lesson.duration;
  if (levelBadge) levelBadge.textContent = COURSES_DATA[currentTrack].level;
  if (instrName) instrName.textContent = lesson.instructor;
  if (instrRole) instrRole.textContent = lesson.instructorRole;
  if (instrAvatar) {
    instrAvatar.textContent = lesson.instructor.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("");
  }
  if (descEl) descEl.textContent = lesson.description;
  if (notesEl) notesEl.textContent = lesson.notes;

  // Ressources
  if (resList) {
    resList.innerHTML = "";
    if (lesson.resources && lesson.resources.length > 0) {
      lesson.resources.forEach(r => {
        const item = document.createElement("li");
        item.className = "resource-item";
        item.innerHTML = `
          <span>📁 ${r.name}</span>
          <a href="${r.url}" target="_blank" rel="noopener noreferrer">Consulter &rarr;</a>
        `;
        resList.appendChild(item);
      });
    } else {
      resList.innerHTML = `<li style="color:var(--muted)">Aucune ressource supplémentaire attachée.</li>`;
    }
  }

  // Bouton terminé
  if (markBtn) {
    const isDone = completedLessons.has(lesson.id);
    if (isDone) {
      markBtn.className = "action-btn completed";
      markBtn.innerHTML = `✓ Terminé`;
    } else {
      markBtn.className = "action-btn";
      markBtn.innerHTML = `○ Marquer comme terminé`;
    }
  }

  renderSyllabus();
}

// Changer de parcours / cours
function switchTrack(trackKey) {
  if (!COURSES_DATA[trackKey]) return;
  currentTrack = trackKey;

  // MAJ des boutons de tracks
  document.querySelectorAll(".track-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.track === trackKey);
  });

  const syllabusTitle = document.getElementById("syllabus-course-title");
  if (syllabusTitle) {
    syllabusTitle.textContent = COURSES_DATA[trackKey].title;
  }

  // Première leçon de ce cours
  currentLesson = COURSES_DATA[trackKey].modules[0].lessons[0];
  selectLesson(currentLesson);
}

// Initialisation globale
document.addEventListener("DOMContentLoaded", () => {
  loadCompletedLessons();

  // Écouteurs de changement de filière
  document.querySelectorAll(".track-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchTrack(btn.dataset.track);
    });
  });

  // Bouton Marquer comme terminé
  const markBtn = document.getElementById("btn-toggle-complete");
  if (markBtn) {
    markBtn.addEventListener("click", () => {
      if (completedLessons.has(currentLesson.id)) {
        completedLessons.delete(currentLesson.id);
      } else {
        completedLessons.add(currentLesson.id);
      }
      saveCompletedLessons();
      selectLesson(currentLesson);
    });
  }

  // Bouton Leçon Suivante
  const nextBtn = document.getElementById("btn-next-lesson");
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const course = COURSES_DATA[currentTrack];
      let allLessons = [];
      course.modules.forEach(m => allLessons.push(...m.lessons));
      const currentIndex = allLessons.findIndex(l => l.id === currentLesson.id);
      if (currentIndex !== -1 && currentIndex < allLessons.length - 1) {
        selectLesson(allLessons[currentIndex + 1]);
      } else {
        alert("Félicitations ! Vous avez atteint la fin de ce parcours.");
      }
    });
  }

  // Boutons des onglets (Description, Ressources, Notes)
  document.querySelectorAll(".tab-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.dataset.tab;
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add("active");
    });
  });

  // Gestion auth (Supabase) pour synchroniser la barre de navigation
  const SUPABASE_URL = 'https://dwtizibjpkdtcceiggxf.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_MeOXYq_SwsXx-IkyPhGqqQ_jGlxMeS5';
  if (typeof supabase !== 'undefined') {
    const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
  }

  // Démarrer sur le premier cours
  switchTrack("ml");
});
