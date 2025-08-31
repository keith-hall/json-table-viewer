class JsonTreeView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.data = {};
    this.config = [];
    this.onAddColumn = null;
    this.onHideColumn = null;
    this.onActionClick = null;
    this.pathMap = new Map(); // Map to track full paths
    this.render();
  }

  static get observedAttributes() {
    return ['data'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'data' && newValue !== oldValue) {
      try {
        this.data = JSON.parse(newValue);
        this.render();
      } catch (e) {
        console.error('Invalid JSON in data attribute:', e);
      }
    }
  }

  setData(data, config = [], callbacks = {}) {
    this.data = data;
    this.config = config;
    this.onAddColumn = callbacks.onAddColumn;
    this.onHideColumn = callbacks.onHideColumn;
    this.onActionClick = callbacks.onActionClick;
    this.pathMap.clear();
    this.render();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          font-size: 14px;
          line-height: 1.5;
        }

        .tree-container {
          padding: 0;
          margin: 0;
        }

        .tree-node {
          position: relative;
          margin: 0;
          padding: 0;
        }

        .tree-item {
          display: flex;
          align-items: flex-start;
          min-height: 28px;
          padding: 2px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .tree-item:last-child {
          border-bottom: none;
        }

        .tree-actions {
          flex-shrink: 0;
          width: 80px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding-right: 8px;
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .tree-item:hover .tree-actions {
          opacity: 1;
        }

        .tree-content {
          flex: 1;
          display: flex;
          align-items: flex-start;
          min-width: 0;
        }

        .tree-key {
          font-weight: 600;
          color: #2c3e50;
          margin-right: 8px;
          white-space: nowrap;
        }

        .tree-value {
          flex: 1;
          word-break: break-word;
          white-space: pre-wrap;
        }

        .tree-primitive {
          color: #495057;
        }

        .tree-string {
          color: #27ae60;
        }

        .tree-number {
          color: #e74c3c;
        }

        .tree-boolean {
          color: #8e44ad;
        }

        .tree-null {
          color: #95a5a6;
          font-style: italic;
        }

        .tree-object {
          color: #34495e;
        }

        .tree-array {
          color: #2980b9;
        }

        .tree-nested {
          margin-left: 20px;
          border-left: 2px solid #ecf0f1;
          padding-left: 12px;
        }

        .tree-toggle {
          background: none;
          border: none;
          color: #7f8c8d;
          font-size: 12px;
          cursor: pointer;
          padding: 2px 4px;
          margin-right: 4px;
          border-radius: 2px;
          transition: background-color 0.2s ease;
        }

        .tree-toggle:hover {
          background-color: #ecf0f1;
        }

        .tree-toggle.collapsed::before {
          content: '▶';
        }

        .tree-toggle.expanded::before {
          content: '▼';
        }

        .tree-toggle.leaf {
          visibility: hidden;
        }

        .tree-collapsed {
          display: none;
        }

        .action-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .action-btn.add {
          background: #28a745;
        }

        .action-btn.hide {
          background: #ffc107;
          color: #212529;
        }

        .action-btn.menu {
          background: #6c757d;
          padding: 2px 8px;
        }

        .action-btn:hover {
          opacity: 0.8;
        }

        .object-table {
          width: 100%;
          border-collapse: collapse;
          margin: 4px 0;
          font-size: 13px;
        }

        .object-table td {
          border: 1px solid #dee2e6;
          padding: 4px 8px;
          vertical-align: top;
        }

        .object-table .key-cell {
          background: #f8f9fa;
          font-weight: 600;
          width: 30%;
        }

        .object-table .value-cell {
          word-break: break-word;
        }

        .array-item {
          margin: 2px 0;
          padding-left: 16px;
          position: relative;
        }

        .array-item::before {
          content: '•';
          position: absolute;
          left: 8px;
          color: #7f8c8d;
        }
      </style>
      <div class="tree-container">
        ${this.renderTreeNode('', this.data, '')}
      </div>
    `;

    this.setupEventListeners();
  }

  renderTreeNode(key, value, parentPath) {
    const path = this.buildPath(key, parentPath);
    const isColumnVisible = this.config.find(c => (typeof c === 'string' ? c : c.path) === path);
    
    if (value === null) {
      return this.renderLeafNode(key, value, 'tree-null', 'null', path, isColumnVisible);
    }
    
    if (value === undefined) {
      return this.renderLeafNode(key, value, 'tree-null', 'undefined', path, isColumnVisible);
    }
    
    if (typeof value === 'string') {
      // Handle escape characters and newlines
      const displayValue = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
      return this.renderLeafNode(key, value, 'tree-string', displayValue, path, isColumnVisible);
    }
    
    if (typeof value === 'number') {
      return this.renderLeafNode(key, value, 'tree-number', String(value), path, isColumnVisible);
    }
    
    if (typeof value === 'boolean') {
      return this.renderLeafNode(key, value, 'tree-boolean', String(value), path, isColumnVisible);
    }
    
    if (Array.isArray(value)) {
      return this.renderArrayNode(key, value, path, isColumnVisible);
    }
    
    if (typeof value === 'object') {
      return this.renderObjectNode(key, value, path, isColumnVisible);
    }
    
    return this.renderLeafNode(key, value, 'tree-primitive', String(value), path, isColumnVisible);
  }

  renderLeafNode(key, value, className, displayValue, path, isColumnVisible) {
    const actions = this.renderActions(path, isColumnVisible);
    const keyDisplay = key ? `${key}:` : '';
    
    return `
      <div class="tree-node">
        <div class="tree-item">
          <div class="tree-actions">${actions}</div>
          <div class="tree-content">
            <button class="tree-toggle leaf"></button>
            ${keyDisplay ? `<span class="tree-key">${this.escapeHTML(keyDisplay)}</span>` : ''}
            <span class="tree-value ${className}">${this.escapeHTML(displayValue)}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderObjectNode(key, obj, parentPath, isColumnVisible) {
    const path = this.buildPath(key, parentPath);
    const actions = this.renderActions(path, isColumnVisible);
    const keyDisplay = key ? `${key}:` : '';
    const keys = Object.keys(obj);
    const nodeId = `node-${this.generateId()}`;
    
    if (keys.length === 0) {
      return this.renderLeafNode(key, obj, 'tree-object', '{}', path, isColumnVisible);
    }

    // For simple objects, use a table for neat alignment
    const isSimpleObject = keys.every(k => {
      const val = obj[k];
      return val === null || val === undefined || typeof val !== 'object' || (typeof val === 'string' && val.length < 50);
    });

    let content = '';
    if (isSimpleObject && keys.length <= 5) {
      // Use table for simple objects
      content = `
        <table class="object-table">
          ${keys.map(k => {
            const val = obj[k];
            const valPath = this.buildPath(k, path);
            const isValColumnVisible = this.config.find(c => (typeof c === 'string' ? c : c.path) === valPath);
            const valActions = this.renderActions(valPath, isValColumnVisible);
            const displayVal = this.formatSimpleValue(val);
            
            return `
              <tr>
                <td class="key-cell">
                  <div style="display: flex; align-items: center; gap: 4px;">
                    <div style="width: 60px; opacity: 0.7;">${valActions}</div>
                    ${this.escapeHTML(k)}
                  </div>
                </td>
                <td class="value-cell">${displayVal}</td>
              </tr>
            `;
          }).join('')}
        </table>
      `;
    } else {
      // Use tree structure for complex objects
      content = `
        <div class="tree-nested ${nodeId}-content">
          ${keys.map(k => this.renderTreeNode(k, obj[k], path)).join('')}
        </div>
      `;
    }

    return `
      <div class="tree-node">
        <div class="tree-item">
          <div class="tree-actions">${actions}</div>
          <div class="tree-content">
            <button class="tree-toggle expanded" data-target="${nodeId}"></button>
            ${keyDisplay ? `<span class="tree-key">${this.escapeHTML(keyDisplay)}</span>` : ''}
            <span class="tree-value tree-object">{${keys.length} ${keys.length === 1 ? 'property' : 'properties'}}</span>
          </div>
        </div>
        ${content}
      </div>
    `;
  }

  renderArrayNode(key, arr, parentPath, isColumnVisible) {
    const path = this.buildPath(key, parentPath);
    const actions = this.renderActions(path, isColumnVisible);
    const keyDisplay = key ? `${key}:` : '';
    const nodeId = `node-${this.generateId()}`;
    
    if (arr.length === 0) {
      return this.renderLeafNode(key, arr, 'tree-array', '[]', path, isColumnVisible);
    }

    const content = `
      <div class="tree-nested ${nodeId}-content">
        ${arr.map((item, index) => `
          <div class="array-item">
            ${this.renderTreeNode(`[${index}]`, item, path)}
          </div>
        `).join('')}
      </div>
    `;

    return `
      <div class="tree-node">
        <div class="tree-item">
          <div class="tree-actions">${actions}</div>
          <div class="tree-content">
            <button class="tree-toggle expanded" data-target="${nodeId}"></button>
            ${keyDisplay ? `<span class="tree-key">${this.escapeHTML(keyDisplay)}</span>` : ''}
            <span class="tree-value tree-array">[${arr.length} ${arr.length === 1 ? 'item' : 'items'}]</span>
          </div>
        </div>
        ${content}
      </div>
    `;
  }

  renderActions(path, isColumnVisible) {
    if (!path) return '';
    
    const columnButton = isColumnVisible 
      ? `<button class="action-btn hide" data-action="hide-column" data-path="${this.escapeHTML(path)}" title="Hide Column">-</button>`
      : `<button class="action-btn add" data-action="add-column" data-path="${this.escapeHTML(path)}" title="Add Column">+</button>`;
    
    return `
      ${columnButton}
      <button class="action-btn menu" data-action="menu" data-path="${this.escapeHTML(path)}" title="More Actions">⋯</button>
    `;
  }

  formatSimpleValue(value) {
    if (value === null) return '<span class="tree-null">null</span>';
    if (value === undefined) return '<span class="tree-null">undefined</span>';
    if (typeof value === 'string') {
      const displayValue = value.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
      return `<span class="tree-string">${this.escapeHTML(displayValue)}</span>`;
    }
    if (typeof value === 'number') return `<span class="tree-number">${value}</span>`;
    if (typeof value === 'boolean') return `<span class="tree-boolean">${value}</span>`;
    if (typeof value === 'object') return `<span class="tree-object">${this.escapeHTML(JSON.stringify(value))}</span>`;
    return this.escapeHTML(String(value));
  }

  buildPath(key, parentPath) {
    if (!key) return parentPath;
    if (!parentPath) return key;
    
    // Handle array indices
    if (key.startsWith('[') && key.endsWith(']')) {
      return parentPath + key;
    }
    
    return parentPath + '.' + key;
  }

  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  setupEventListeners() {
    this.shadowRoot.addEventListener('click', (e) => {
      if (e.target.matches('.tree-toggle:not(.leaf)')) {
        const target = e.target.dataset.target;
        const content = this.shadowRoot.querySelector(`.${target}-content`);
        if (content) {
          const isExpanded = e.target.classList.contains('expanded');
          if (isExpanded) {
            e.target.classList.remove('expanded');
            e.target.classList.add('collapsed');
            content.classList.add('tree-collapsed');
          } else {
            e.target.classList.remove('collapsed');
            e.target.classList.add('expanded');
            content.classList.remove('tree-collapsed');
          }
        }
      }

      if (e.target.matches('.action-btn[data-action]')) {
        const action = e.target.dataset.action;
        const path = e.target.dataset.path;
        
        if (action === 'add-column' && this.onAddColumn) {
          this.onAddColumn(path);
        } else if (action === 'hide-column' && this.onHideColumn) {
          this.onHideColumn(path);
        } else if (action === 'menu' && this.onActionClick) {
          this.onActionClick(action, path, e.target);
        }
      }
    });
  }
}

customElements.define('json-tree-view', JsonTreeView);