// ========= CONFIG =========
const BASE_URL = "https://api1.specmonkey.com";

// ========= ELEMENTS =========
const orgInput = document.getElementById("orgInput");

const taskTitleInput = document.getElementById("taskTitleInput");
const taskDescriptionInput = document.getElementById("taskDescriptionInput");

const criteriaListEl = document.getElementById("criteriaList");
const addCriteriaBtn = document.getElementById("addCriteriaBtn");

const generateBtn = document.getElementById("generateBtn");
const newTaskBtn = document.getElementById("newTaskBtn");

const additionalCountInput = document.getElementById("additionalCountInput");

const remainingEl = document.getElementById("remainingCount");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");

// ========= STATE =========
let allTestCases = [];
let lastGeneratedTitles = [];
let hasAnyTestCases = false;

// ========= HELPERS =========
function setLoading(value) {
  generateBtn.disabled = value;
  newTaskBtn.disabled = value;
  addCriteriaBtn.disabled = value;

  const removeBtns = document.querySelectorAll(".removeCriteriaBtn");
  removeBtns.forEach(b => (b.disabled = value));

  if (value) {
    statusEl.innerHTML = `<span class="loaderRow"><span class="spinner"></span>Generating test cases…</span>`;
  } else {
    statusEl.textContent = "";
  }
}

function setRemaining(value) {
  const n = Number(value);
  remainingEl.textContent = Number.isFinite(n) ? String(n) : "–";

  if (Number.isFinite(n) && n <= 0) {
    generateBtn.disabled = true;
    statusEl.textContent = "Trial limit reached";
  }
}

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getOrganization() {
  return (orgInput?.value || "").trim().toLowerCase();
}

function getAcceptanceCriteriaValues() {
  if (!criteriaListEl) return [];
  const inputs = criteriaListEl.querySelectorAll("input[data-criteria]");
  return Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
}

function addCriteriaRow(value = "") {
  const row = document.createElement("div");
  row.className = "criteriaRow";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "e.g., Item added with correct quantity and price";
  input.value = value;
  input.setAttribute("data-criteria", "1");

  const removeBtn = document.createElement("button");
  removeBtn.className = "iconBtn removeCriteriaBtn";
  removeBtn.type = "button";
  removeBtn.textContent = "–";
  removeBtn.title = "Remove criteria";
  removeBtn.addEventListener("click", () => row.remove());

  row.appendChild(input);
  row.appendChild(removeBtn);
  criteriaListEl.appendChild(row);
}

function clearResultsUI() {
  resultsEl.classList.add("emptyState");
  resultsEl.textContent = "No test cases yet";
}

function setButtonLabel() {
  generateBtn.textContent = hasAnyTestCases
    ? "Generate additional test cases"
    : "Generate test cases";
}

function clampAdditionalCount() {
  let n = parseInt(additionalCountInput.value, 10);
  if (!Number.isFinite(n) || n < 1) n = 1;
  if (n > 10) n = 10;
  additionalCountInput.value = String(n);
  return n;
}

function validateForm() {
  const org = getOrganization();
  const title = (taskTitleInput?.value || "").trim();
  const desc = (taskDescriptionInput?.value || "").trim();

  if (!org) return "Please enter organization";
  if (!title) return "Please enter task title";
  if (!desc) return "Please enter task description";
  return null;
}

function buildGenerateUrl(org) {
  return `${BASE_URL}/organization/${encodeURIComponent(org)}/generate-test-cases`;
}

function buildAdditionalUrl(org, numberOfTests) {
  return `${BASE_URL}/organization/${encodeURIComponent(org)}/generate-test-additional-cases?numberOfTests=${encodeURIComponent(numberOfTests)}`;
}

// ========= RENDER =========
// Пробрасываем индекс первого нового элемента, чтобы подсветить и проскроллить
function renderAllTestCasesAccordion({ flashFromIndex = null } = {}) {
  resultsEl.innerHTML = "";
  resultsEl.classList.remove("emptyState");

  if (!allTestCases || allTestCases.length === 0) {
    clearResultsUI();
    return;
  }

  let firstNewElement = null;

  allTestCases.forEach((tc, index) => {
    const item = document.createElement("div");
    item.className = "tcItem";
    item.dataset.index = String(index);

    // подсветка новых элементов
    if (flashFromIndex !== null && index >= flashFromIndex) {
      item.classList.add("flash");
      if (!firstNewElement) firstNewElement = item;
    }

    const header = document.createElement("button");
    header.type = "button";
    header.className = "tcHeader";

    const titleWrap = document.createElement("div");
    titleWrap.className = "tcTitle";
    titleWrap.textContent = `${index + 1}. ${tc.title ?? `Test case ${index + 1}`}`;

    const chevron = document.createElement("div");
    chevron.className = "tcChevron";
    chevron.textContent = "+";

    header.appendChild(titleWrap);
    header.appendChild(chevron);

    const body = document.createElement("div");
    body.className = "tcBody";

    const meta = document.createElement("div");
    meta.className = "tcMeta";
    meta.innerHTML = `
      <div><b>Type:</b> ${escapeHtml(tc.testCaseType || "")}</div>
      <div><b>Preconditions:</b> ${escapeHtml(tc.preconditions || "")}</div>
    `;

    const stepsWrap = document.createElement("div");
    stepsWrap.className = "steps";

    (tc.steps || []).forEach((s) => {
      const stepRow = document.createElement("div");
      stepRow.className = "stepRow";
      stepRow.innerHTML = `
        <div class="label">Step</div>
        <div class="text">${escapeHtml(s.step || "")}</div>
        <div class="label" style="margin-top:8px;">Expected result</div>
        <div class="text">${escapeHtml(s.expectedResult || "")}</div>
      `;
      stepsWrap.appendChild(stepRow);
    });

    body.appendChild(meta);
    body.appendChild(stepsWrap);

    header.addEventListener("click", () => {
      const isOpen = body.classList.contains("open");

      // close others
      const allBodies = resultsEl.querySelectorAll(".tcBody");
      const allChevrons = resultsEl.querySelectorAll(".tcChevron");
      allBodies.forEach(b => b.classList.remove("open"));
      allChevrons.forEach(c => (c.textContent = "+"));

      if (!isOpen) {
        body.classList.add("open");
        chevron.textContent = "–";
      }
    });

    item.appendChild(header);
    item.appendChild(body);
    resultsEl.appendChild(item);
  });

  // ✅ авто-скролл к первому новому элементу
  if (firstNewElement) {
    firstNewElement.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

// ========= MERGE LOGIC =========
function mergeAdditionalTestCases(newCases) {
  if (!newCases || newCases.length === 0) return { addedCount: 0 };

  const existingTitles = new Set(allTestCases.map(tc => (tc.title || "").trim().toLowerCase()));
  let addedCount = 0;

  newCases.forEach(tc => {
    const key = (tc.title || "").trim().toLowerCase();
    if (!key) return;

    if (!existingTitles.has(key)) {
      allTestCases.push(tc);
      existingTitles.add(key);
      addedCount++;
    }
  });

  return { addedCount };
}

// ========= API CALL =========
async function callApi() {
  const error = validateForm();
  if (error) {
    statusEl.textContent = error;
    return;
  }

  const org = getOrganization();
  const acceptanceCriteria = getAcceptanceCriteriaValues();

  const payload = {
    taskTitle: taskTitleInput.value.trim(),
    taskDescription: taskDescriptionInput.value.trim(),
    acceptanceCriteria: acceptanceCriteria,
    alreadyExistingTests: (lastGeneratedTitles && lastGeneratedTitles.length > 0) ? lastGeneratedTitles : []
  };

  const additionalCount = clampAdditionalCount();
  const isAdditional = hasAnyTestCases;

  const url = isAdditional
    ? buildAdditionalUrl(org, additionalCount)
    : buildGenerateUrl(org);

  setLoading(true);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`Server error (${res.status})`);

    const data = await res.json();

    setRemaining(data.remainingTestCases);

    const returnedCases = data.testCases || [];

    if (!isAdditional) {
      allTestCases = returnedCases;
      renderAllTestCasesAccordion();
    } else {
      const before = allTestCases.length;
      const { addedCount } = mergeAdditionalTestCases(returnedCases);

      // flashFromIndex = первый новый
      const flashFromIndex = addedCount > 0 ? before : null;
      renderAllTestCasesAccordion({ flashFromIndex });

      if (addedCount === 0) {
        statusEl.textContent = "No new test cases (duplicates filtered)";
      } else {
        statusEl.textContent = `Added ${addedCount} test case(s)`;
      }
    }

    // titles for alreadyExistingTests
    lastGeneratedTitles = allTestCases.map(tc => tc.title).filter(Boolean);

    hasAnyTestCases = allTestCases.length > 0;
    setButtonLabel();

  } catch (e) {
    console.error(e);
    if (!hasAnyTestCases) clearResultsUI();
    statusEl.textContent = e.message || "Something went wrong";
  } finally {
    // если статус мы выставили "Added ..." — оставим, иначе очистим
    if (statusEl.innerHTML.includes("spinner")) statusEl.textContent = "";
    setLoading(false);
  }
}

// ========= NEW TASK =========
function resetAll() {
  taskTitleInput.value = "";
  taskDescriptionInput.value = "";
  criteriaListEl.innerHTML = "";

  allTestCases = [];
  lastGeneratedTitles = [];
  hasAnyTestCases = false;

  remainingEl.textContent = "–";
  statusEl.textContent = "";
  additionalCountInput.value = "10";

  setButtonLabel();
  clearResultsUI();
}

// ========= EVENTS =========
addCriteriaBtn.addEventListener("click", () => addCriteriaRow(""));
generateBtn.addEventListener("click", () => callApi());
newTaskBtn.addEventListener("click", () => resetAll());
additionalCountInput.addEventListener("change", () => clampAdditionalCount());

// ========= INIT =========
remainingEl.textContent = "–";
setButtonLabel();
clearResultsUI();

// Show hint to enter organization first
if (!getOrganization()) {
  statusEl.innerHTML = `<span style="color: #2e7d32;">👆 Please enter your organization name in the header to get started</span>`;
  //orgInput.style.outline = "2px solid #fff";
  //orgInput.style.outlineOffset = "2px";
  
  // Remove hint and highlight when user starts typing
  orgInput.addEventListener("input", function onFirstInput() {
    if (getOrganization()) {
      statusEl.textContent = "";
      orgInput.style.outline = "";
      orgInput.style.outlineOffset = "";
      orgInput.removeEventListener("input", onFirstInput);
    }
  });
}
