const defaultData = [
  { "Name":"Bob", "Value":14, "examples":{"x":"an","y":"object"}, "id": 123 },
  { "Name":"Tim", "Value":"14", "examples":["an","array"] },
  { "Name":"Ned", "Value":NaN, "examples":[["an","array"],["of","arrays"]] },
  { "Name":"Jim", "Value":undefined, "examples":[{"x":"an","y":"array"}, {"x":"of","y":"objects"}] },
  { "Name":"Mark", "Value":null, "examples":{"x":["an","object"],"y":["of","arrays"]} },
  { "Name":"Dave", "Value":false, "examples":{"x":{"z":"an","w":"object"},"y":{"z":"of","w":"objects"}} },
  { "Name":"Dan", "Value":true, "examples":[{"x":["an","array"],"y":["of","objects"]}, {"x":["of"],"y":["arrays"]}] },
  { "Name":"Pete", "Value":{}, "examples":{"x":[{"z":"an","w":"object"}, {"z":"of","w":"arrays"}],"y":[{"z":"of","w":"objects"}, {"z":"blah","w":"blah"}]} },
  { "Name":"Joe", "Value":[], "examples":{"x":[["an","object"], ["of","arrays"]],"y":[["of","arrays"], ["blah","blah"]] }},
  { "Name":"Sam", "Value":[], "examples":{"x":[[{"w":"an"},{"w":"object"}], [{"w":"of"},{"w":"arrays"}]],"y":[[{"w":"of"},{"w":"arrays"}], [{"w":"of"},{"w":"objects"}]] }},
  { "Name":"Stan", "examples":[
      [
        [["an","array"],["of","arrays"]],
        [["blah","blah"],["blah","blah"]],
      ],
      [
        [["of","arrays"],["of","arrays"]],
        [["blah","blah"],[["with"],["nested",["arrays"]]]]
      ]
    ]
  }
];

const defaultConfig = [
  "Name",
  "Value",
  "examples.x",
  "examples.y",
  "id"
];

const tableContainer = document.getElementById("tableContainer");
const jsonInput = document.getElementById("jsonInput");
const configInput = document.getElementById("configInput");

// Global state for modal
let currentData = [];
let currentConfig = [];
let currentRowIndex = 0;
let hiddenRows = new Set();

function loadFromLocalStorage() {
  jsonInput.value = localStorage.jsonInput || JSON.stringify(defaultData, null, 2);
  configInput.value = localStorage.configInput || JSON.stringify(defaultConfig, null, 2);
}

loadFromLocalStorage();

function saveToLocalStorage() {
  localStorage.jsonInput = jsonInput.value;
  localStorage.configInput = configInput.value;
}

// Helper to get deep value by path
function getValueByPath(obj, path) {
  if (!path) return undefined;
  let parts = typeof path === 'string' ? path.split('.') : path;
  let cur = obj;
  for (let part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

// Generate flat list of columns from data (top-level keys unless nested in config)
function inferColumns(data) {
  if (!Array.isArray(data)) return [];
  let cols = new Set();
  for (let row of data) {
    Object.keys(row || {}).forEach(k => cols.add(k));
  }
  return Array.from(cols);
}

// Get all field paths from a row recursively
function getAllFieldPaths(obj, prefix = '') {
  const paths = [];
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      paths.push(path);
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        paths.push(...getAllFieldPaths(value, path));
      }
    }
  }
  return paths;
}

// Hide row functionality
function hideRow(rowIndex) {
  hiddenRows.add(rowIndex);
  updateTable();
}

// Show row details modal
function showRowDetails(rowIndex) {
  if (!currentData[rowIndex]) return;
  
  currentRowIndex = rowIndex;
  const modal = document.getElementById('rowModal');
  const rowDetails = document.getElementById('rowDetails');
  const rowPosition = document.getElementById('rowPosition');
  
  // Update navigation
  updateModalNavigation();
  rowPosition.textContent = `Row ${rowIndex + 1} of ${currentData.length}`;
  
  // Generate field table
  const row = currentData[rowIndex];
  const allPaths = getAllFieldPaths(row);
  
  let tableHTML = '<table class="field-table">';
  for (const path of allPaths) {
    const value = getValueByPath(row, path);
    const valueStr = value === undefined ? 'undefined' : 
                     value === null ? 'null' : 
                     typeof value === 'object' ? JSON.stringify(value) : 
                     String(value);
    
    tableHTML += `
      <tr>
        <td class="field-name">
          ${escapeHTML(path)}
          <button class="add-column-btn" onclick="addColumn('${escapeHTML(path)}')">+ Add Column</button>
        </td>
        <td class="field-value">${escapeHTML(valueStr)}</td>
      </tr>
    `;
  }
  tableHTML += '</table>';
  
  rowDetails.innerHTML = tableHTML;
  modal.style.display = 'block';
}

// Update modal navigation buttons
function updateModalNavigation() {
  const prevBtn = document.getElementById('prevRowBtn');
  const nextBtn = document.getElementById('nextRowBtn');
  
  prevBtn.disabled = currentRowIndex <= 0;
  nextBtn.disabled = currentRowIndex >= currentData.length - 1;
}

// Navigate to previous row in modal
function navigateToPreviousRow() {
  if (currentRowIndex > 0) {
    showRowDetails(currentRowIndex - 1);
  }
}

// Navigate to next row in modal
function navigateToNextRow() {
  if (currentRowIndex < currentData.length - 1) {
    showRowDetails(currentRowIndex + 1);
  }
}

// Add column to configuration
function addColumn(path) {
  try {
    const config = JSON.parse(configInput.value);
    if (!config.find(c => (typeof c === 'string' ? c : c.path) === path)) {
      config.push(path);
      configInput.value = JSON.stringify(config, null, 2);
      updateTable();
    }
  } catch (e) {
    alert('Error parsing column configuration');
  }
}

// Recursively render table cell (handles objects/arrays)
function renderCell(value) {
  if (value == null) return '<i>null</i>';
  // Special case for undefined, NaN, etc.
  if (typeof value === 'undefined') return '<i>undefined</i>';
  if (typeof value === 'number' && isNaN(value)) return '<i>NaN</i>';
  if (Array.isArray(value)) {
    // Array of objects or primitives? (If at least one element is object, show nested)
    if (value.length > 0 && value.some(v => typeof v === 'object' && v !== null)) {
      // Try to extract all unique keys for headings if possible
      let subCols = [];
      for (let v of value) {
        if (typeof v === 'object' && v !== null && !Array.isArray(v))
          Object.keys(v).forEach(k => subCols.includes(k) || subCols.push(k));
      }
      // If all elements are arrays or primitives, no headings
      if (subCols.length === 0)
        return `<table class="nested-table"><tr><td>${value.map(v => renderCell(v)).join('</td></tr><tr><td>')}</td></tr></table>`;
      // Otherwise render as nested table
      return renderTable(value, subCols.map(k => ({ path: k })));
    } else {
      // Array of primitives
      return `<table class="nested-table"><tr>${value.map(v => `<td>${renderCell(v)}</td>`).join('')}</tr></table>`;
    }
  }
  if (typeof value === 'object') {
    // Render object as a one-row table with keys as headings
    let keys = Object.keys(value);
    if(keys.length === 0) return '{}';
    return renderTable([value], keys.map(k => ({ path: k })));
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return escapeHTML(value);
}

function escapeHTML(str) {
  return String(str)
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// Renders a table for array of objects based on columns
function renderTable(data, columns, isMainTable = false) {
  if (!Array.isArray(data)) return '<i>not an array</i>';
  if (!Array.isArray(columns)) columns = [];
  // Filter hidden columns, resolve config
  let colDefs = columns.map(c => {
    if (typeof c === 'string') return {path: c, label: c};
    if (typeof c === 'object') return {
      path: c.path,
      label: c.label || c.path,
      hidden: !!c.hidden
    };
    return null;
  }).filter(x => x && !x.hidden);
  if (colDefs.length === 0 && Array.isArray(data) && typeof data[0] === 'object') {
    colDefs = Object.keys(data[0] || {}).map(k => ({path: k, label: k}));
  }
  
  // Add action column for main table
  let thead = '';
  if (isMainTable && colDefs.length) {
    thead = `<tr><th>Actions</th>${colDefs.map(col => `<th>${escapeHTML(col.label)}</th>`).join('')}</tr>`;
  } else if (colDefs.length) {
    thead = `<tr>${colDefs.map(col => `<th>${escapeHTML(col.label)}</th>`).join('')}</tr>`;
  }
  
  let rows = data.map((row, index) => {
    // Skip hidden rows for main table
    if (isMainTable && hiddenRows.has(index)) {
      return '';
    }
    
    const rowClass = isMainTable ? 'main-table-row' : '';
    const rowClick = isMainTable ? `onclick="showRowDetails(${index})" style="cursor: pointer;"` : '';
    
    let rowContent = '';
    if (isMainTable) {
      rowContent += `<td><button class="hide-btn" onclick="event.stopPropagation(); hideRow(${index})">Hide</button></td>`;
    }
    
    rowContent += colDefs.map(col => {
      let value = getValueByPath(row, col.path);
      return `<td>${renderCell(value)}</td>`;
    }).join('');
    
    return `<tr class="${rowClass}" ${rowClick}>${rowContent}</tr>`;
  }).filter(row => row !== '').join('');
  
  return `<table class="nested-table">${thead}${rows}</table>`;
}

function updateTable() {
  let data, config;
  // Parse data
  try {
    data = JSON.parse(jsonInput.value);
  } catch {
    tableContainer.innerHTML = "<b>Error parsing JSON data</b>";
    return;
  }
  // Parse config
  try {
    config = JSON.parse(configInput.value);
  } catch {
    tableContainer.innerHTML = "<b>Error parsing column config JSON</b>";
    return;
  }
  
  // Store current data and config for modal use
  currentData = data;
  currentConfig = config;
  
  tableContainer.innerHTML = renderTable(data, config, true);
  saveToLocalStorage();
}

function loadJson() {
  updateTable();
}

function loadConfig() {
  updateTable();
}

// Initial render
updateTable();

// React to textareas live edit (optional: debounce for perf)
jsonInput.addEventListener('input', () => { saveToLocalStorage(); });
configInput.addEventListener('input', () => { saveToLocalStorage(); });

// Modal event handlers
document.addEventListener('DOMContentLoaded', function() {
  const modal = document.getElementById('rowModal');
  const closeBtn = document.querySelector('.close');
  const prevBtn = document.getElementById('prevRowBtn');
  const nextBtn = document.getElementById('nextRowBtn');
  
  // Close modal when clicking X
  closeBtn.addEventListener('click', function() {
    modal.style.display = 'none';
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
  
  // Navigation buttons
  prevBtn.addEventListener('click', navigateToPreviousRow);
  nextBtn.addEventListener('click', navigateToNextRow);
  
  // Keyboard navigation
  document.addEventListener('keydown', function(event) {
    if (modal.style.display === 'block') {
      switch(event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          navigateToPreviousRow();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          navigateToNextRow();
          break;
        case 'Escape':
          event.preventDefault();
          modal.style.display = 'none';
          break;
      }
    }
  });
});