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
function renderTable(data, columns) {
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
  let thead = colDefs.length
    ? `<tr>${colDefs.map(col => `<th>${escapeHTML(col.label)}</th>`).join('')}</tr>`
    : '';
  let rows = data.map(row => {
    return `<tr>${
      colDefs.map(col => {
        let value = getValueByPath(row, col.path);
        return `<td>${renderCell(value)}</td>`;
      }).join('')
    }</tr>`;
  }).join('');
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
  tableContainer.innerHTML = renderTable(data, config);
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