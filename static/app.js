// Home Maintenance Portal (Static) - app.js
// Uses IndexedDB for storage

const DB_NAME = 'home_maintainence_portal';
const DB_VERSION = 1;
const CATEGORY_STORE = 'categories';
const RECORD_STORE = 'records';

let db;

// Default categories (can be edited to add more)
const defaultCategories = [
  { name: 'Plumbing', label: 'Plumbing' },
  { name: 'Electrical', label: 'Electrical' },
  { name: 'Heating', label: 'Heating' }
];

// Open IndexedDB and initialize stores
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function (event) {
      db = event.target.result;
      if (!db.objectStoreNames.contains(CATEGORY_STORE)) {
        db.createObjectStore(CATEGORY_STORE, { keyPath: 'name' });
      }
      if (!db.objectStoreNames.contains(RECORD_STORE)) {
        const recordStore = db.createObjectStore(RECORD_STORE, { keyPath: 'id', autoIncrement: true });
        recordStore.createIndex('category', 'category', { unique: false });
      }
    };
    request.onsuccess = function (event) {
      db = event.target.result;
      resolve(db);
    };
    request.onerror = function (event) {
      reject(event.target.error);
    };
  });
}

// Initialize categories if not present
async function initCategories() {
  const tx = db.transaction(CATEGORY_STORE, 'readwrite');
  const store = tx.objectStore(CATEGORY_STORE);
  for (const cat of defaultCategories) {
    store.put(cat);
  }
  await tx.complete;
}

// Fetch all categories
function getCategories() {
  return new Promise((resolve) => {
    const tx = db.transaction(CATEGORY_STORE, 'readonly');
    const store = tx.objectStore(CATEGORY_STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

// Render category buttons
async function renderCategories() {
  const categories = await getCategories();
  const container = document.getElementById('category-container');
  container.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'category-btn';
    btn.textContent = cat.label;
    btn.onclick = () => showCategory(cat.name);
    container.appendChild(btn);
  });
}

// Show category records and form
async function showCategory(category) {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <h2>${category}</h2>
    <form id="record-form">
      <label>Date:</label>
      <input type="date" name="date" required><br>
      <label>Company:</label>
      <input type="text" name="company" required><br>
      <label>Type of Maintenance:</label>
      <input type="text" name="type" required><br>
      <label>Notes:</label>
      <textarea name="notes"></textarea><br>
      <label>Upload PDF:</label>
      <input type="file" name="pdf" accept="application/pdf"><br><br>
      <input type="submit" value="Add Record">
      <button type="button" onclick="renderCategories()">Back to Home</button>
    </form>
    <h3>Previous Records</h3>
    <ul class="record-list" id="record-list"></ul>
  `;
  document.getElementById('record-form').onsubmit = (e) => handleAddRecord(e, category);
  renderRecords(category);
}

// Add a new record
async function handleAddRecord(e, category) {
  e.preventDefault();
  const form = e.target;
  const date = form.date.value;
  const company = form.company.value;
  const type = form.type.value;
  const notes = form.notes.value;
  const pdfFile = form.pdf.files[0];

  let pdfData = null;
  let pdfName = null;
  if (pdfFile) {
    pdfName = pdfFile.name;
    pdfData = await fileToArrayBuffer(pdfFile);
  }

  const tx = db.transaction(RECORD_STORE, 'readwrite');
  const store = tx.objectStore(RECORD_STORE);
  store.add({
    category,
    date,
    company,
    type,
    notes,
    pdf: pdfName,
    pdfData
  });
  await tx.complete;
  showCategory(category);
}

// Convert file to ArrayBuffer
function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Render records for a category
function renderRecords(category) {
  const tx = db.transaction(RECORD_STORE, 'readonly');
  const store = tx.objectStore(RECORD_STORE);
  const idx = store.index('category');
  const req = idx.getAll(IDBKeyRange.only(category));
  req.onsuccess = () => {
    const records = req.result;
    const list = document.getElementById('record-list');
    list.innerHTML = '';
    records.forEach(record => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${record.date}</strong> - ${record.company} (${record.type})<br>
        ${record.notes ? record.notes : ''}
        ${record.pdf ? `<br><a href="#" onclick="viewPDF(${record.id});return false;">View PDF</a>` : ''}
      `;
      list.appendChild(li);
    });
  };
}

// View PDF from IndexedDB
function viewPDF(id) {
  const tx = db.transaction(RECORD_STORE, 'readonly');
  const store = tx.objectStore(RECORD_STORE);
  const req = store.get(id);
  req.onsuccess = () => {
    const record = req.result;
    if (record && record.pdfData) {
      const blob = new Blob([record.pdfData], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      alert('PDF not found');
    }
  };
}

// On page load
window.onload = async function () {
  await openDB();
  await initCategories();
  renderCategories();
};
