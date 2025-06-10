# API Loading for Excalidraw - Quick Start

This implementation adds the ability to load preset Excalidraw content from API endpoints.

## 🚀 Quick Start

### Method 1: URL Parameters (Easiest)

Add these parameters to your Excalidraw URL:

```
https://your-excalidraw-app.com/?apiUrl=https://api.example.com/template
```

### Method 2: Programmatic Loading

```typescript
import { loadSceneFromAPI } from './data';

const sceneData = await loadSceneFromAPI('https://api.example.com/template');
excalidrawAPI.updateScene({
  elements: sceneData.elements || [],
  appState: { ...excalidrawAPI.getAppState(), ...sceneData.appState }
});
```

## 📝 Files Modified

- **`excalidraw-app/data/index.ts`**: Added `loadSceneFromAPI()` and `loadSceneEnhanced()` functions
- **`excalidraw-app/App.tsx`**: Updated `initializeScene()` to support API loading via URL parameters

## 🔧 New Functions

### `loadSceneFromAPI(apiUrl, options)`
Loads Excalidraw scene data from any API endpoint.

**Parameters:**
- `apiUrl`: The API endpoint URL
- `options`: Optional configuration (method, headers, body, timeout)

### `loadSceneEnhanced(id, privateKey, localDataState, apiUrl, apiOptions)`
Enhanced version of the original `loadScene()` that adds API loading support with fallbacks.

## 🧪 Testing

1. **Start the test server:**
   ```bash
   node test-api-loading.js
   ```

2. **Test with your Excalidraw app:**
   ```
   http://localhost:3000/?apiUrl=http://localhost:8080/api/template
   ```

## 📋 Supported URL Parameters

- `apiUrl` or `api_url`: API endpoint URL (required)
- `apiMethod` or `api_method`: HTTP method (GET/POST, default: GET)
- `apiHeaders` or `api_headers`: JSON headers (URL-encoded)
- `apiBody` or `api_body`: Request body (URL-encoded)
- `apiTimeout` or `api_timeout`: Timeout in ms (default: 10000)

## 📊 Supported API Response Formats

Your API can return data in any of these formats:

```json
// Direct format
{
  "elements": [...],
  "appState": {...},
  "files": {...}
}

// Nested format  
{
  "scene": {
    "elements": [...],
    "appState": {...}
  }
}

// Wrapped format
{
  "data": {
    "elements": [...],
    "appState": {...}
  }
}
```

## 🔐 Security Features

- CORS support
- Authentication headers
- Request timeouts
- Error handling with fallbacks
- URL parameter validation

## 📖 Full Documentation

See `API_LOADING_GUIDE.md` for comprehensive documentation with examples and best practices.

## 🎯 Use Cases

- **Template galleries**: Load predefined drawing templates
- **Dynamic content**: Generate drawings based on data
- **Collaborative presets**: Share standardized starting points
- **Integration**: Connect with existing content management systems

The implementation maintains full backward compatibility while adding powerful new API loading capabilities! 