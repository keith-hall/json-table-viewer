class JsonTableViewer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Default configuration
    this.currentData = [];
    this.currentConfig = [];
    this.currentRowIndex = 0;
    this.hiddenRows = new Set();
    
    this.render();
    this.setupEventListeners();
  }

  static get observedAttributes() {
    return ['data', 'config', 'show-controls'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  get data() {
    // Prioritize programmatically set data over attribute data
    // This prevents attribute data from overriding programmatic changes
    if (this.currentData.length > 0 || !this.getAttribute('data')) {
      return this.currentData;
    }
    
    const dataAttr = this.getAttribute('data');
    try {
      return JSON.parse(dataAttr);
    } catch (e) {
      console.error('Invalid JSON in data attribute:', e);
      return [];
    }
  }

  set data(value) {
    this.currentData = Array.isArray(value) ? value : [];
    // Update textarea control if it exists and controls are shown
    this.updateDataTextarea();
    this.updateTable();
  }

  get config() {
    // Prioritize programmatically set config over attribute config
    // This prevents attribute config from overriding programmatic changes
    if (this.currentConfig.length > 0 || !this.getAttribute('config')) {
      return this.currentConfig;
    }
    
    const configAttr = this.getAttribute('config');
    try {
      return JSON.parse(configAttr);
    } catch (e) {
      console.error('Invalid JSON in config attribute:', e);
      return [];
    }
  }

  set config(value) {
    this.currentConfig = Array.isArray(value) ? value : [];
    // Update textarea control if it exists and controls are shown
    this.updateConfigTextarea();
    this.updateTable();
  }

  get showControls() {
    return this.hasAttribute('show-controls');
  }

  render() {
    const showControls = this.showControls;
    
    // Shadow DOM styles must be inline as they need to be encapsulated
    // Moving to external CSS would break the component's style isolation
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --border-color: #e1e8ed;
          --hover-color: #e8f4fd;
        }

        .container {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .controls {
          padding: 20px;
          background: #f8f9fa;
          border-bottom: 1px solid var(--border-color);
          display: ${showControls ? 'block' : 'none'};
        }

        .control-group {
          margin-bottom: 15px;
        }

        .control-group:last-child {
          margin-bottom: 0;
        }

        label {
          display: block;
          font-weight: 600;
          margin-bottom: 5px;
          color: #2c3e50;
        }

        textarea {
          width: 100%;
          min-height: 80px;
          font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
          border: 2px solid var(--border-color);
          border-radius: 6px;
          padding: 10px;
          font-size: 13px;
          line-height: 1.4;
          resize: vertical;
          box-sizing: border-box;
        }

        textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        button {
          background: var(--primary-gradient);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
        }

        button:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(102, 126, 234, 0.3);
        }

        .table-container {
          padding: 20px;
          overflow-x: auto;
        }

        table {
          border-collapse: collapse;
          width: 100%;
          background: white;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        td, th {
          border: 1px solid var(--border-color);
          padding: 10px 12px;
          vertical-align: top;
          text-align: left;
          font-size: 14px;
        }

        th {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          font-weight: 600;
          color: #495057;
          position: sticky;
          top: 0;
        }

        tr:nth-child(even) {
          background-color: #f8f9fa;
        }

        .main-table-row {
          transition: background-color 0.2s ease;
          cursor: pointer;
        }

        .main-table-row:hover {
          background-color: var(--hover-color) !important;
        }

        .nested-table {
          background: #fafbfc;
          margin: 0;
          width: 100%;
          box-shadow: none;
          border-radius: 3px;
        }

        .nested-table td, .nested-table th {
          border: 1px solid #dee2e6;
          padding: 6px 8px;
          font-size: 12px;
        }

        .hide-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 11px;
          cursor: pointer;
          margin-right: 8px;
          transition: background 0.2s ease;
        }

        .hide-btn:hover {
          background: #c82333;
          transform: none;
          box-shadow: none;
        }

        /* Modal styles */
        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(3px);
        }

        .modal-content {
          background-color: white;
          margin: 5% auto;
          padding: 24px;
          border-radius: 12px;
          width: 90%;
          max-width: 700px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          position: relative;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #e9ecef;
        }

        .modal-title {
          font-size: 1.3em;
          font-weight: 500;
          color: #2c3e50;
          margin: 0;
        }

        .close {
          color: #aaa;
          font-size: 24px;
          font-weight: bold;
          cursor: pointer;
          transition: color 0.3s ease;
          background: none;
          border: none;
          padding: 0;
          margin: 0;
        }

        .close:hover {
          color: #dc3545;
        }

        .modal-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .nav-btn {
          background: #6c757d;
          padding: 6px 12px;
          font-size: 12px;
        }

        .nav-btn:disabled {
          background: #dee2e6;
          color: #6c757d;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .field-table {
          width: 100%;
        }

        .field-name {
          background: #f8f9fa;
          font-weight: 600;
          width: 180px;
        }

        .field-value {
          word-break: break-all;
        }

        .add-column-btn {
          background: #28a745;
          padding: 3px 6px;
          font-size: 10px;
          border-radius: 2px;
          margin-left: 6px;
        }

        .add-column-btn:hover {
          background: #218838;
          transform: none;
          box-shadow: none;
        }

        .error {
          color: #dc3545;
          font-weight: 500;
          padding: 12px;
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 4px;
          margin: 10px 0;
        }
      </style>
      
      <div class="container">
        ${showControls ? `
        <div class="controls">
          <div class="control-group">
            <label for="jsonInput">JSON Data:</label>
            <textarea id="jsonInput" placeholder="Paste your JSON array here..."></textarea>
            <button id="loadJsonBtn">Load JSON</button>
          </div>
          <div class="control-group">
            <label for="configInput">Column Configuration:</label>
            <textarea id="configInput" placeholder="Configure visible columns..."></textarea>
            <button id="loadConfigBtn">Update Columns</button>
          </div>
        </div>
        ` : ''}
        
        <div class="table-container">
          <div id="tableContainer"></div>
        </div>
      </div>

      <div id="rowModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Row Details</h3>
            <button class="close">&times;</button>
          </div>
          <div class="modal-navigation">
            <button id="prevRowBtn" class="nav-btn">← Previous</button>
            <span id="rowPosition"></span>
            <button id="nextRowBtn" class="nav-btn">Next →</button>
          </div>
          <div id="rowDetails"></div>
        </div>
      </div>
    `;

    this.updateTable();
  }

  setupEventListeners() {
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target.matches('#loadJsonBtn')) {
        this.loadJson();
      } else if (e.target.matches('#loadConfigBtn')) {
        this.loadConfig();
      } else if (e.target.matches('.close')) {
        this.closeModal();
      } else if (e.target.matches('#prevRowBtn')) {
        this.navigateToPreviousRow();
      } else if (e.target.matches('#nextRowBtn')) {
        this.navigateToNextRow();
      } else if (e.target.matches('.hide-btn')) {
        e.stopPropagation();
        const rowIndex = parseInt(e.target.dataset.rowIndex);
        this.hideRow(rowIndex);
      } else if (e.target.matches('.main-table-row, .main-table-row *')) {
        const row = e.target.closest('.main-table-row');
        if (row) {
          const rowIndex = parseInt(row.dataset.rowIndex);
          this.showRowDetails(rowIndex);
        }
      } else if (e.target.matches('.add-column-btn')) {
        const path = e.target.dataset.path;
        this.addColumn(path);
      }
    });

    this.shadowRoot.addEventListener('keydown', (e) => {
      const modal = this.shadowRoot.getElementById('rowModal');
      if (modal.style.display === 'block') {
        switch(e.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            e.preventDefault();
            this.navigateToPreviousRow();
            break;
          case 'ArrowRight':
          case 'ArrowDown':
            e.preventDefault();
            this.navigateToNextRow();
            break;
          case 'Escape':
            e.preventDefault();
            this.closeModal();
            break;
        }
      }
    });

    // Close modal when clicking outside
    this.shadowRoot.addEventListener('click', (e) => {
      const modal = this.shadowRoot.getElementById('rowModal');
      if (e.target === modal) {
        this.closeModal();
      }
    });
  }

  // Helper methods from the original code
  updateDataTextarea() {
    if (this.showControls) {
      const jsonInput = this.shadowRoot.getElementById('jsonInput');
      if (jsonInput) {
        jsonInput.value = JSON.stringify(this.currentData, null, 2);
      }
    }
  }

  updateConfigTextarea() {
    if (this.showControls) {
      const configInput = this.shadowRoot.getElementById('configInput');
      if (configInput) {
        configInput.value = JSON.stringify(this.currentConfig, null, 2);
      }
    }
  }

  getValueByPath(obj, path) {
    if (!path) return undefined;
    let parts = typeof path === 'string' ? path.split('.') : path;
    let cur = obj;
    for (let part of parts) {
      if (cur == null) return undefined;
      cur = cur[part];
    }
    return cur;
  }

  getAllFieldPaths(obj, prefix = '') {
    const paths = [];
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        paths.push(path);
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          paths.push(...this.getAllFieldPaths(value, path));
        }
      }
    }
    return paths;
  }

  escapeHTML(str) {
    // Use the browser's built-in HTML escaping via textContent
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  renderCell(value) {
    if (value == null) return '<i>null</i>';
    if (typeof value === 'undefined') return '<i>undefined</i>';
    if (typeof value === 'number' && isNaN(value)) return '<i>NaN</i>';
    
    if (Array.isArray(value)) {
      if (value.length > 0 && value.some(v => typeof v === 'object' && v !== null)) {
        let subCols = [];
        for (let v of value) {
          if (typeof v === 'object' && v !== null && !Array.isArray(v))
            Object.keys(v).forEach(k => subCols.includes(k) || subCols.push(k));
        }
        if (subCols.length === 0)
          return `<table class="nested-table"><tr><td>${value.map(v => this.renderCell(v)).join('</td></tr><tr><td>')}</td></tr></table>`;
        return this.renderTable(value, subCols.map(k => ({ path: k })), false);
      } else {
        return `<table class="nested-table"><tr>${value.map(v => `<td>${this.renderCell(v)}</td>`).join('')}</tr></table>`;
      }
    }
    
    if (typeof value === 'object') {
      let keys = Object.keys(value);
      if(keys.length === 0) return '{}';
      return this.renderTable([value], keys.map(k => ({ path: k })), false);
    }
    
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return this.escapeHTML(value);
  }

  renderTable(data, columns, isMainTable = false) {
    if (!Array.isArray(data)) return '<i>not an array</i>';
    if (!Array.isArray(columns)) columns = [];
    
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
    
    let thead = '';
    if (isMainTable && colDefs.length) {
      // Future enhancement: Make Actions column fixed width and other columns resizable
      // - Actions column should be only wide enough for buttons and non-resizable
      // - Other columns should be resizable by dragging borders or double-clicking to fit content
      thead = `<tr><th>Actions</th>${colDefs.map(col => `<th>${this.escapeHTML(col.label)}</th>`).join('')}</tr>`;
    } else if (colDefs.length) {
      thead = `<tr>${colDefs.map(col => `<th>${this.escapeHTML(col.label)}</th>`).join('')}</tr>`;
    }
    
    let rows = data.map((row, index) => {
      if (isMainTable && this.hiddenRows.has(index)) {
        return '';
      }
      
      const rowClass = isMainTable ? 'main-table-row' : '';
      const rowData = isMainTable ? `data-row-index="${index}"` : '';
      
      let rowContent = '';
      if (isMainTable) {
        rowContent += `<td><button class="hide-btn" data-row-index="${index}">-</button></td>`;
      }
      
      rowContent += colDefs.map(col => {
        let value = this.getValueByPath(row, col.path);
        return `<td>${this.renderCell(value)}</td>`;
      }).join('');
      
      return `<tr class="${rowClass}" ${rowData}>${rowContent}</tr>`;
    }).filter(row => row !== '').join('');
    
    return `<table class="nested-table">${thead}${rows}</table>`;
  }

  updateTable() {
    const container = this.shadowRoot.getElementById('tableContainer');
    if (!container) return;

    const data = this.data;
    const config = this.config;

    if (!Array.isArray(data)) {
      container.innerHTML = '<div class="error">Data must be an array</div>';
      return;
    }

    container.innerHTML = this.renderTable(data, config, true);
  }

  loadJson() {
    const jsonInput = this.shadowRoot.getElementById('jsonInput');
    if (!jsonInput) return;

    try {
      const data = JSON.parse(jsonInput.value);
      this.data = data;
      this.dispatchEvent(new CustomEvent('datachange', { detail: { data } }));
    } catch (e) {
      const container = this.shadowRoot.getElementById('tableContainer');
      container.innerHTML = '<div class="error">Error parsing JSON data</div>';
    }
  }

  loadConfig() {
    const configInput = this.shadowRoot.getElementById('configInput');
    if (!configInput) return;

    try {
      const config = JSON.parse(configInput.value);
      this.config = config;
      this.dispatchEvent(new CustomEvent('configchange', { detail: { config } }));
    } catch (e) {
      const container = this.shadowRoot.getElementById('tableContainer');
      container.innerHTML = '<div class="error">Error parsing column config JSON</div>';
    }
  }

  hideRow(rowIndex) {
    this.hiddenRows.add(rowIndex);
    this.updateTable();
    this.dispatchEvent(new CustomEvent('rowhide', { detail: { rowIndex } }));
  }

  showRowDetails(rowIndex) {
    const data = this.data;
    if (!data[rowIndex]) return;
    
    this.currentRowIndex = rowIndex;
    const modal = this.shadowRoot.getElementById('rowModal');
    const rowDetails = this.shadowRoot.getElementById('rowDetails');
    const rowPosition = this.shadowRoot.getElementById('rowPosition');
    
    this.updateModalNavigation();
    rowPosition.textContent = `Row ${rowIndex + 1} of ${data.length}`;
    
    const row = data[rowIndex];
    const allPaths = this.getAllFieldPaths(row);
    
    let tableHTML = '<table class="field-table">';
    for (const path of allPaths) {
      const value = this.getValueByPath(row, path);
      const valueStr = value === undefined ? 'undefined' : 
                       value === null ? 'null' : 
                       typeof value === 'object' ? JSON.stringify(value) : 
                       String(value);
      
      // Future enhancement: Add column visibility toggle and custom action buttons
      // - Show "Hide Column" button when column is already visible
      // - Add hamburger menu for additional custom actions with callback support
      // - Keep UI compact while providing extensibility for component users
      tableHTML += `
        <tr>
          <td class="field-name">
            ${this.escapeHTML(path)}
            <button class="add-column-btn" data-path="${this.escapeHTML(path)}">+ Add Column</button>
          </td>
          <td class="field-value">${this.escapeHTML(valueStr)}</td>
        </tr>
      `;
    }
    tableHTML += '</table>';
    
    rowDetails.innerHTML = tableHTML;
    modal.style.display = 'block';
    
    this.dispatchEvent(new CustomEvent('rowdetails', { detail: { rowIndex, row } }));
  }

  updateModalNavigation() {
    const prevBtn = this.shadowRoot.getElementById('prevRowBtn');
    const nextBtn = this.shadowRoot.getElementById('nextRowBtn');
    const data = this.data;
    
    prevBtn.disabled = this.currentRowIndex <= 0;
    nextBtn.disabled = this.currentRowIndex >= data.length - 1;
  }

  navigateToPreviousRow() {
    if (this.currentRowIndex > 0) {
      this.showRowDetails(this.currentRowIndex - 1);
    }
  }

  navigateToNextRow() {
    const data = this.data;
    if (this.currentRowIndex < data.length - 1) {
      this.showRowDetails(this.currentRowIndex + 1);
    }
  }

  addColumn(path) {
    const config = this.config;
    if (!config.find(c => (typeof c === 'string' ? c : c.path) === path)) {
      config.push(path);
      this.config = config;
      
      // Update control if visible
      const configInput = this.shadowRoot.getElementById('configInput');
      if (configInput) {
        configInput.value = JSON.stringify(config, null, 2);
      }
      
      this.dispatchEvent(new CustomEvent('columnAdd', { detail: { path, config } }));
    }
  }

  closeModal() {
    const modal = this.shadowRoot.getElementById('rowModal');
    modal.style.display = 'none';
  }

  // Public API methods
  setData(data) {
    this.data = data;
  }

  getData() {
    return this.data;
  }

  setConfig(config) {
    this.config = config;
  }

  getConfig() {
    return this.config;
  }

  showHiddenRows() {
    this.hiddenRows.clear();
    this.updateTable();
  }

  getHiddenRows() {
    return Array.from(this.hiddenRows);
  }

  unhideRow(rowIndex) {
    this.hiddenRows.delete(rowIndex);
    this.updateTable();
    this.dispatchEvent(new CustomEvent('rowunhide', { detail: { rowIndex } }));
  }

  // Export current state including data, config, and hidden rows
  // This method provides a complete snapshot for persistence or debugging
  exportData() {
    return {
      data: this.data,
      config: this.config,
      hiddenRows: Array.from(this.hiddenRows)
    };
  }
}

// Register the custom element
customElements.define('json-table-viewer', JsonTableViewer);
