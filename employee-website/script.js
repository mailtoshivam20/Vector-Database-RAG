// Employee records live in employees.json (also used to build the chatbot's vector DB).
let employees = [];

const palette = ["#2f5bea", "#0e9f6e", "#d97706", "#db2777", "#7c3aed", "#0891b2", "#dc2626", "#4b5563"];
let departments = [];

const $ = id => document.getElementById(id);
const grid = $("grid");
const searchInput = $("search");
const deptSelect = $("department");
const sortSelect = $("sort");

const initials = name => name.split(" ").map(p => p[0]).slice(0, 2).join("");
const colorFor = dept => palette[departments.indexOf(dept) % palette.length];
const formatDate = iso => new Date(iso + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "short" });
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function avatar(e, large = false) {
  return `<div class="avatar${large ? " lg" : ""}" style="background:${colorFor(e.department)}">${escapeHtml(initials(e.name))}</div>`;
}

function renderStats() {
  const locations = new Set(employees.map(e => e.location)).size;
  const stats = [
    [employees.length, "Employees"],
    [departments.length, "Departments"],
    [locations, "Locations"],
  ];
  $("stats").innerHTML = stats.map(([n, l]) => `<div class="stat"><strong>${n}</strong><span>${l}</span></div>`).join("");
}

function filtered() {
  const q = searchInput.value.trim().toLowerCase();
  const dept = deptSelect.value;
  const list = employees.filter(e => {
    if (dept && e.department !== dept) return false;
    if (!q) return true;
    return [e.name, e.role, e.department, e.location, ...e.skills].join(" ").toLowerCase().includes(q);
  });
  const sorters = {
    name: (a, b) => a.name.localeCompare(b.name),
    joined: (a, b) => b.joined.localeCompare(a.joined),
    department: (a, b) => a.department.localeCompare(b.department) || a.name.localeCompare(b.name),
  };
  return list.sort(sorters[sortSelect.value]);
}

function render() {
  const list = filtered();
  grid.innerHTML = list.map(e => `
    <button class="card" data-email="${escapeHtml(e.email)}">
      <div class="card-head">
        ${avatar(e)}
        <div>
          <h3>${escapeHtml(e.name)}</h3>
          <p class="role">${escapeHtml(e.role)}</p>
        </div>
      </div>
      <span class="badge">${escapeHtml(e.department)}</span>
      <div class="meta">📍 ${escapeHtml(e.location)} · Since ${formatDate(e.joined)}</div>
    </button>`).join("");
  $("resultCount").textContent = `Showing ${list.length} of ${employees.length} employees`;
  $("empty").hidden = list.length > 0;
}

function showDetail(e) {
  $("detailBody").innerHTML = `
    <div class="detail-head">
      ${avatar(e, true)}
      <div>
        <h2>${escapeHtml(e.name)}</h2>
        <p class="role">${escapeHtml(e.role)}</p>
      </div>
    </div>
    <p>${escapeHtml(e.bio)}</p>
    <dl>
      <dt>Department</dt><dd>${escapeHtml(e.department)}</dd>
      <dt>Email</dt><dd><a href="mailto:${escapeHtml(e.email)}">${escapeHtml(e.email)}</a></dd>
      <dt>Phone</dt><dd><a href="tel:${escapeHtml(e.phone.replace(/\s/g, ""))}">${escapeHtml(e.phone)}</a></dd>
      <dt>Location</dt><dd>${escapeHtml(e.location)}</dd>
      <dt>Joined</dt><dd>${formatDate(e.joined)}</dd>
      <dt>Skills</dt><dd class="skills">${e.skills.map(s => `<span class="badge">${escapeHtml(s)}</span>`).join("")}</dd>
    </dl>`;
  $("detail").showModal();
}

[searchInput, deptSelect, sortSelect].forEach(el => el.addEventListener("input", render));
grid.addEventListener("click", ev => {
  const card = ev.target.closest(".card");
  if (card) showDetail(employees.find(e => e.email === card.dataset.email));
});
$("closeDetail").addEventListener("click", () => $("detail").close());
$("detail").addEventListener("click", ev => { if (ev.target === $("detail")) $("detail").close(); });

fetch("employees.json").then(r => r.json()).then(data => {
  employees = data;
  departments = [...new Set(employees.map(e => e.department))].sort();
  deptSelect.innerHTML += departments.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
  renderStats();
  render();
});
