# JSON Table Viewer

A powerful, modern Web Component for visualizing complex JSON data in table format with interactive features.

![JSON Table Viewer Demo](https://github.com/user-attachments/assets/3f120369-d719-4efe-8e98-be16f2651885)

## ✨ Features

- 🎨 **Modern Design**: Beautiful gradient styling with smooth animations
- 📱 **Responsive**: Works on desktop and mobile devices  
- 🔍 **Row Details**: Click rows to see detailed field-by-field view
- ⌨️ **Keyboard Navigation**: Use arrow keys to navigate between row details
- 🚫 **Hide Rows**: Hide unwanted rows with a single click
- ➕ **Dynamic Columns**: Add columns on-the-fly from the row details modal
- 🌲 **Nested Data**: Automatically renders nested objects and arrays
- 🎛️ **Configurable**: Flexible column configuration with labels and visibility
- 🔧 **Web Component**: Easy to integrate into any web application

## 🚀 Quick Start

### As a Web Component (Recommended)

```html
<!-- Include the Web Component -->
<script src="json-table-viewer.js"></script>

<!-- Use with controls -->
<json-table-viewer show-controls></json-table-viewer>

<!-- Use with attributes -->
<json-table-viewer
  data='[{"name":"Alice","age":30}]'
  config='["name","age"]'
></json-table-viewer>
```

### Standalone HTML

Open `json_table.html` in your browser for a complete standalone version.

## 📚 API Reference

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `data` | JSON String | The JSON array data to display |
| `config` | JSON String | Array of column configurations |
| `show-controls` | Boolean | Show input controls for data and config |

### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `setData(data)` | Array | Set the data array programmatically |
| `getData()` | - | Get the current data array |
| `setConfig(config)` | Array | Set the column configuration |
| `getConfig()` | - | Get the current column configuration |
| `showHiddenRows()` | - | Show all hidden rows |
| `exportData()` | - | Export current state |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `datachange` | `{ data }` | Fired when data is changed |
| `configchange` | `{ config }` | Fired when column configuration is changed |
| `rowdetails` | `{ rowIndex, row }` | Fired when row details modal is opened |
| `rowhide` | `{ rowIndex }` | Fired when a row is hidden |
| `columnAdd` | `{ path, config }` | Fired when a column is added |

## 🎯 Column Configuration

Configure columns using simple strings or objects:

```json
[
  "Name",
  { "path": "examples.x", "label": "X Value" },
  { "path": "id", "hidden": true }
]
```

## 📖 Examples

Check out the interactive demo at `index.html` for complete examples and documentation.

Inspired by [TabulatingJsonEditor](https://cheersgames.com/JsonEditor/TabulatingJsonEditor.html)
