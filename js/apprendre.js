// Supabase-backed video catalogue and semester resources.

const COURSE_TRACKS = {
  ml: "Machine Learning",
  dl: "Deep Learning & Computer Vision",
  nlp: "NLP & LLMs",
  python: "Python & Data",
  robotics: "Robotique"
};

let currentTrack = "ml";
let currentLesson = null;
const completedLessons = new Set();

function videosForTrack(track) {
  return CIAA_STORE.getVideos().filter(video => video.track === track);
}

function updateProgressBar() {
  const lessons = videosForTrack(currentTrack);
  const completed = lessons.filter(lesson => completedLessons.has(lesson.id)).length;
  const percent = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
  const fill = document.getElementById("course-progress-fill");
  const text = document.getElementById("course-progress-text");
  const percentText = document.getElementById("course-progress-percent");
  if (fill) fill.style.width = `${percent}%`;
  if (text) text.textContent = `${completed} / ${lessons.length} vidéos terminées`;
  if (percentText) percentText.textContent = `${percent}%`;
}

function renderSyllabus() {
  const container = document.getElementById("modules-list");
  if (!container) return;
  container.replaceChildren();
  const lessons = videosForTrack(currentTrack);
  const title = document.getElementById("syllabus-course-title");
  if (title) title.textContent = COURSE_TRACKS[currentTrack];

  if (lessons.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Aucune vidéo n’a été publiée pour ce parcours.";
    container.appendChild(empty);
    updateProgressBar();
    return;
  }

  const moduleBox = document.createElement("div");
  moduleBox.className = "module-box";
  const heading = document.createElement("div");
  heading.className = "module-head";
  heading.innerHTML = `<span>${lessons[0].categoryName || COURSE_TRACKS[currentTrack]}</span><span class="badge">${lessons.length} vidéos</span>`;
  const list = document.createElement("ul");
  list.className = "lesson-list";
  moduleBox.append(heading, list);

  lessons.forEach((lesson, index) => {
    const item = document.createElement("li");
    const active = currentLesson?.id === lesson.id;
    const done = completedLessons.has(lesson.id);
    item.className = `lesson-item ${active ? "active" : ""} ${done ? "done" : ""}`;
    item.addEventListener("click", () => selectLesson(lesson));

    const info = document.createElement("div");
    info.className = "lesson-info";
    const icon = document.createElement("div");
    icon.className = "lesson-icon";
    icon.textContent = done ? "✓" : active ? "▶" : "•";
    const name = document.createElement("span");
    name.className = "lesson-title-text";
    name.textContent = lesson.title;
    info.append(icon, name);

    const duration = document.createElement("span");
    duration.className = "lesson-duration";
    duration.textContent = lesson.duration || "";
    item.append(info, duration);
    list.appendChild(item);
  });

  container.appendChild(moduleBox);
  updateProgressBar();
}

function selectLesson(lesson) {
  currentLesson = lesson;
  const player = document.getElementById("yt-player");
  if (player) {
    player.src = lesson.youtubeId
      ? `https://www.youtube.com/embed/${encodeURIComponent(lesson.youtubeId)}?rel=0`
      : "about:blank";
    player.title = lesson.title || "Lecteur vidéo";
  }

  const values = {
    "player-track-badge": lesson.categoryName || COURSE_TRACKS[currentTrack],
    "player-duration-badge": lesson.duration || "",
    "player-lesson-title": lesson.title || "",
    "player-instructor-name": lesson.instructor || "",
    "tab-desc-content": lesson.description || ""
  };
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  const avatar = document.getElementById("player-instructor-avatar");
  if (avatar) {
    avatar.textContent = (lesson.instructor || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word[0])
      .join("");
  }

  const toggleButton = document.getElementById("btn-toggle-complete");
  if (toggleButton) {
    toggleButton.disabled = false;
    toggleButton.textContent = completedLessons.has(lesson.id)
      ? "✓ Marquer comme non terminé"
      : "○ Marquer comme terminé";
  }
  renderSyllabus();
}

function switchTrack(track) {
  if (!Object.hasOwn(COURSE_TRACKS, track)) return;
  currentTrack = track;
  document.querySelectorAll(".track-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.track === track);
  });
  const lessons = videosForTrack(track);
  if (lessons.length) selectLesson(lessons[0]);
  else {
    currentLesson = null;
    const player = document.getElementById("yt-player");
    if (player) player.src = "about:blank";
    [
      "player-track-badge",
      "player-duration-badge",
      "player-lesson-title",
      "player-instructor-name",
      "player-instructor-avatar",
      "tab-desc-content"
    ].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.textContent = "";
    });
    const button = document.getElementById("btn-toggle-complete");
    if (button) {
      button.disabled = true;
      button.textContent = "○ Marquer comme terminé";
    }
    renderSyllabus();
  }
}

window.switchTrack = switchTrack;

function renderDynamicDrives() {
  const sdsiContainer = document.getElementById("drives-sdsi-container");
  const miateContainer = document.getElementById("drives-miate-container");
  if (!sdsiContainer || !miateContainer) return;

  sdsiContainer.replaceChildren();
  miateContainer.replaceChildren();
  const drives = CIAA_STORE.getDrives();
  const sdsi = drives.filter(drive => drive.master === "SDSI");
  const miate = drives.filter(drive => drive.master === "MIATE");

  if (!drives.length) {
    [sdsiContainer, miateContainer].forEach(container => {
      const empty = document.createElement("p");
      empty.textContent = "Aucune ressource Drive n’a été publiée.";
      container.appendChild(empty);
    });
    return;
  }

  sdsi.forEach(drive => sdsiContainer.appendChild(createDriveModuleBox(drive)));
  miate.forEach(drive => miateContainer.appendChild(createDriveModuleBox(drive)));
}

function createDriveModuleBox(drive) {
  const box = document.createElement("div");
  box.className = "semester-box";
  box.dataset.sem = drive.semestre;

  const header = document.createElement("div");
  header.className = "semester-header-row";
  header.innerHTML = `<div class="semester-title"><span class="sem-pill">${drive.semestre.toUpperCase()}</span><span>${drive.moduleName}</span></div><span style="font-size:0.75rem;color:var(--muted)">${drive.master}</span>`;
  box.appendChild(header);

  if (drive.imageUrl || drive.description) {
    const details = document.createElement("div");
    details.style.cssText = "display:flex;align-items:center;gap:12px;margin-bottom:10px";
    if (drive.imageUrl) {
      const image = document.createElement("img");
      image.src = drive.imageUrl;
      image.alt = drive.moduleName;
      image.style.cssText = "width:48px;height:48px;border-radius:8px;object-fit:cover";
      details.appendChild(image);
    }
    if (drive.description) {
      const description = document.createElement("p");
      description.textContent = drive.description;
      description.style.cssText = "margin:0;font-size:0.83rem;color:#435e76;line-height:1.4";
      details.appendChild(description);
    }
    box.appendChild(details);
  }

  const links = document.createElement("div");
  links.className = "semester-sublinks";
  [
    ["Cours", drive.driveCours],
    ["TP", drive.driveTP],
    ["TD", drive.driveTD],
    ["Anciens Examens", drive.driveExamens]
  ].forEach(([label, href]) => {
    if (!href) return;
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    links.appendChild(link);
  });
  box.appendChild(links);
  return box;
}

function filterSemesters(semester) {
  document.querySelectorAll(".sem-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.sem === semester);
  });
  document.querySelectorAll(".semester-box").forEach(box => {
    const matches = semester === "all" || box.dataset.sem === semester;
    box.style.display = matches ? "block" : "none";
    box.classList.toggle("highlighted", matches && semester !== "all");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await CIAA_STORE.ready;
  renderDynamicDrives();

  document.querySelectorAll(".track-btn").forEach(button => {
    button.addEventListener("click", () => switchTrack(button.dataset.track));
  });
  document.querySelectorAll(".sem-btn").forEach(button => {
    button.addEventListener("click", () => filterSemesters(button.dataset.sem));
  });

  const markButton = document.getElementById("btn-toggle-complete");
  if (markButton) {
    markButton.addEventListener("click", () => {
      if (!currentLesson) return;
      if (completedLessons.has(currentLesson.id)) completedLessons.delete(currentLesson.id);
      else completedLessons.add(currentLesson.id);
      selectLesson(currentLesson);
    });
  }

  const stepLesson = offset => {
    const lessons = videosForTrack(currentTrack);
    const index = lessons.findIndex(lesson => lesson.id === currentLesson?.id);
    const next = lessons[index + offset];
    if (next) selectLesson(next);
  };
  document.getElementById("btn-prev-lesson")?.addEventListener("click", () => stepLesson(-1));
  document.getElementById("btn-next-lesson")?.addEventListener("click", () => stepLesson(1));

  document.querySelectorAll(".tab-nav-btn").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-nav-btn").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab)?.classList.add("active");
    });
  });

  CIAA_STORE.syncNavigation();
  switchTrack("ml");
});
