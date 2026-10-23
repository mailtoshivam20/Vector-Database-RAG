// Sample (fictional) employee data — replace or extend with real records.
const employees = [
  { name: "Avery Lancaster", role: "CEO & Co-Founder", department: "Leadership", email: "avery.lancaster@insurellm.com", phone: "+1 415 555 0101", location: "San Francisco, CA", joined: "2015-03-01", skills: ["Strategy", "Fundraising", "InsurTech"], bio: "Co-founded Insurellm to modernise insurance with technology and leads company vision and growth." },
  { name: "Maxine Thompson", role: "Lead Data Engineer", department: "Engineering", email: "maxine.thompson@insurellm.com", phone: "+1 415 555 0112", location: "Austin, TX", joined: "2017-01-15", skills: ["Python", "Spark", "Data Pipelines"], bio: "Owns the data platform powering pricing models and analytics across all products." },
  { name: "Oliver Spencer", role: "Backend Developer", department: "Engineering", email: "oliver.spencer@insurellm.com", phone: "+1 415 555 0123", location: "Remote", joined: "2019-06-10", skills: ["Java", "Microservices", "AWS"], bio: "Builds core policy and claims services used by Carllm and Homellm." },
  { name: "Priya Nair", role: "Machine Learning Engineer", department: "Engineering", email: "priya.nair@insurellm.com", phone: "+1 415 555 0134", location: "San Francisco, CA", joined: "2021-09-01", skills: ["PyTorch", "RAG", "NLP"], bio: "Develops AI features including the internal knowledge assistant and risk scoring models." },
  { name: "Emily Tran", role: "Product Manager", department: "Product", email: "emily.tran@insurellm.com", phone: "+1 415 555 0145", location: "New York, NY", joined: "2018-04-23", skills: ["Roadmapping", "User Research", "Agile"], bio: "Leads the Rellm reinsurance platform from discovery through delivery." },
  { name: "Jordan Blake", role: "UX Designer", department: "Product", email: "jordan.blake@insurellm.com", phone: "+1 415 555 0156", location: "Remote", joined: "2022-02-14", skills: ["Figma", "Design Systems", "Accessibility"], bio: "Designs customer-facing portals and maintains the Insurellm design system." },
  { name: "Samuel Trenton", role: "Sales Director", department: "Sales", email: "samuel.trenton@insurellm.com", phone: "+1 415 555 0167", location: "Chicago, IL", joined: "2016-08-08", skills: ["Enterprise Sales", "Negotiation", "CRM"], bio: "Leads the enterprise sales team and key carrier partnerships." },
  { name: "Alex Chen", role: "Account Executive", department: "Sales", email: "alex.chen@insurellm.com", phone: "+1 415 555 0178", location: "Chicago, IL", joined: "2023-03-20", skills: ["B2B Sales", "Prospecting"], bio: "Manages mid-market accounts for Marketllm and Bizllm." },
  { name: "Nina Patel", role: "Marketing Manager", department: "Marketing", email: "nina.patel@insurellm.com", phone: "+1 415 555 0189", location: "New York, NY", joined: "2020-11-02", skills: ["Content", "SEO", "Campaigns"], bio: "Runs brand, content and demand generation campaigns." },
  { name: "Carlos Mendes", role: "Customer Success Lead", department: "Customer Success", email: "carlos.mendes@insurellm.com", phone: "+1 415 555 0190", location: "Austin, TX", joined: "2019-01-07", skills: ["Onboarding", "Support", "Retention"], bio: "Helps clients get value from Insurellm products and leads the support team." },
  { name: "Grace Kim", role: "HR Business Partner", department: "People", email: "grace.kim@insurellm.com", phone: "+1 415 555 0201", location: "San Francisco, CA", joined: "2018-10-15", skills: ["Recruiting", "Employee Relations"], bio: "Supports hiring, onboarding and employee wellbeing across the company." },
  { name: "Daniel Okafor", role: "Finance Controller", department: "Finance", email: "daniel.okafor@insurellm.com", phone: "+1 415 555 0212", location: "Remote", joined: "2020-05-18", skills: ["Accounting", "FP&A", "Compliance"], bio: "Oversees financial reporting, budgeting and audits." },
];

const palette = ["#2f5bea", "#0e9f6e", "#d97706", "#db2777", "#7c3aed", "#0891b2", "#dc2626", "#4b5563"];
const departments = [...new Set(employees.map(e => e.department))].sort();

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

deptSelect.innerHTML += departments.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
[searchInput, deptSelect, sortSelect].forEach(el => el.addEventListener("input", render));
grid.addEventListener("click", ev => {
  const card = ev.target.closest(".card");
  if (card) showDetail(employees.find(e => e.email === card.dataset.email));
});
$("closeDetail").addEventListener("click", () => $("detail").close());
$("detail").addEventListener("click", ev => { if (ev.target === $("detail")) $("detail").close(); });

renderStats();
render();
