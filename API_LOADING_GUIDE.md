# API Loading for Preset Excalidraw Content

This guide explains how to load preset Excalidraw content from API endpoints using the new API loading functionality.

## Overview

The enhanced Excalidraw application now supports loading scene data from custom API endpoints, allowing you to:

- Load predefined drawings from your backend
- Create templates and starter content
- Integrate with content management systems
- Build dynamic drawing experiences

## Features

### 1. URL Parameter Loading

Load content automatically using URL parameters:

```
https://your-excalidraw-app.com/?apiUrl=https://api.example.com/drawings/template1
```

#### Supported URL Parameters

- `apiUrl` or `api_url`: The API endpoint URL (required)
- `apiMethod` or `api_method`: HTTP method (GET/POST, default: GET)
- `apiHeaders` or `api_headers`: JSON-encoded headers (URL-encoded)
- `apiBody` or `api_body`: Request body for POST requests (URL-encoded)
- `apiTimeout` or `api_timeout`: Request timeout in milliseconds (default: 10000)

#### Examples

**Simple GET request:**
```
?apiUrl=https://api.example.com/drawings/123
```

**POST request with headers:**
```
?apiUrl=https://api.example.com/drawings&apiMethod=POST&apiHeaders=%7B%22Authorization%22%3A%22Bearer%20token%22%7D&apiBody=%7B%22id%22%3A123%7D
```

### 2. Programmatic Loading

Use the `loadSceneFromAPI` function directly in your code:

```typescript
import { loadSceneFromAPI } from './data';

// Simple GET request
const sceneData = await loadSceneFromAPI('https://api.example.com/drawings/123');

// With options
const sceneData = await loadSceneFromAPI('https://api.example.com/drawings', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ templateId: 'starter-template' }),
  timeout: 15000
});

// Load into Excalidraw
excalidrawAPI.updateScene({
  elements: sceneData.elements || [],
  appState: {
    ...excalidrawAPI.getAppState(),
    ...sceneData.appState,
  },
});
```

### 3. Enhanced Scene Loading

The `loadSceneEnhanced` function provides a unified interface that combines API loading with existing functionality:

```typescript
import { loadSceneEnhanced } from './data';

const scene = await loadSceneEnhanced(
  null, // backend ID
  null, // private key
  localDataState, // local storage fallback
  'https://api.example.com/drawings/123', // API URL
  { // API options
    method: 'GET',
    headers: { 'Authorization': 'Bearer token' }
  }
);
```

### 4. Custom Format
Any JSON object containing `elements`, `appState`, or `files` properties at the root level.

### 5. Content Field Format
```json
{
  "id": 141,
  "unique_id": "e8ff97",
  "content": {
    "elements": [...],
    "appState": {...},
    "files": {...}
  },
  "note_id": null,
  "user_id": 13
}
```

This format is used by APIs like [organisewise.me](https://prod.backend.organisewise.me/draw/excalidraw/e8ff97) where the Excalidraw data is nested under a `content` field.

## API Response Formats

The API loading functionality supports multiple response formats:

### 1. Direct Excalidraw Format
```json
{
  "elements": [...],
  "appState": {...},
  "files": {...}
}
```

### 2. Nested Scene Format
```json
{
  "scene": {
    "elements": [...],
    "appState": {...},
    "files": {...}
  }
}
```

### 3. Wrapped Data Format
```json
{
  "data": {
    "elements": [...],
    "appState": {...},
    "files": {...}
  }
}
```

### 4. Content Field Format
```json
{
  "id": 141,
  "unique_id": "e8ff97",
  "content": {
    "elements": [...],
    "appState": {...},
    "files": {...}
  },
  "note_id": null,
  "user_id": 13
}
```

This format is used by APIs like [organisewise.me](https://prod.backend.organisewise.me/draw/excalidraw/e8ff97) where the Excalidraw data is nested under a `content` field.

### 5. Custom Format
Any JSON object containing `elements`, `appState`, or `files` properties at the root level.

## Error Handling

The API loading includes comprehensive error handling:

- **Network errors**: Connection failures, timeouts
- **HTTP errors**: 404, 500, etc.
- **Data validation**: Invalid JSON or missing required fields
- **Graceful fallback**: Falls back to local storage or default state

## Security Considerations

### CORS
Ensure your API endpoints have proper CORS headers:

```
Access-Control-Allow-Origin: https://your-excalidraw-domain.com
Access-Control-Allow-Methods: GET, POST
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Authentication
Use secure authentication methods:

```typescript
const sceneData = await loadSceneFromAPI('https://api.example.com/drawings/123', {
  headers: {
    'Authorization': 'Bearer ' + getAccessToken(),
    'X-API-Key': 'your-api-key'
  }
});
```

## Implementation Examples

### 1. Template Gallery

```typescript
const templates = [
  { id: 'flowchart', name: 'Flowchart Template', url: '/api/templates/flowchart' },
  { id: 'wireframe', name: 'Wireframe Template', url: '/api/templates/wireframe' },
  { id: 'diagram', name: 'System Diagram', url: '/api/templates/diagram' }
];

const loadTemplate = async (templateUrl) => {
  try {
    const sceneData = await loadSceneFromAPI(templateUrl);
    excalidrawAPI.updateScene({
      elements: sceneData.elements || [],
      appState: { ...excalidrawAPI.getAppState(), ...sceneData.appState }
    });
  } catch (error) {
    console.error('Failed to load template:', error);
  }
};
```

### 2. Collaborative Presets

```typescript
const loadSharedDrawing = async (drawingId, userToken) => {
  const sceneData = await loadSceneFromAPI(`/api/shared-drawings/${drawingId}`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  
  excalidrawAPI.updateScene({
    elements: sceneData.elements || [],
    appState: sceneData.appState || {}
  });
  
  // Zoom to content
  if (sceneData.elements?.length > 0) {
    excalidrawAPI.scrollToContent(sceneData.elements, {
      fitToViewport: true,
      animate: true
    });
  }
};
```

### 3. Dynamic Content Loading

```typescript
const loadUserWorkspace = async (userId) => {
  const sceneData = await loadSceneFromAPI('/api/workspaces/current', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, timestamp: Date.now() })
  });
  
  return sceneData;
};
```

## API Server Implementation

Here's an example of how to implement the server-side API:

### Express.js Example

```javascript
app.get('/api/drawings/:id', async (req, res) => {
  try {
    const drawing = await database.getDrawing(req.params.id);
    
    res.json({
      elements: drawing.elements,
      appState: drawing.appState,
      files: drawing.files || {}
    });
  } catch (error) {
    res.status(404).json({ error: 'Drawing not found' });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const { templateId } = req.body;
    const template = await database.getTemplate(templateId);
    
    res.json({
      scene: {
        elements: template.elements,
        appState: template.appState
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load template' });
  }
});
```

## Best Practices

1. **Caching**: Implement client-side caching for frequently used templates
2. **Compression**: Use gzip compression for large scene data
3. **Validation**: Validate scene data on both client and server
4. **Fallbacks**: Always provide fallback content for failed requests
5. **Performance**: Lazy load templates and optimize payload sizes
6. **User Experience**: Show loading states and error messages

## Troubleshooting

### Common Issues

1. **CORS errors**: Ensure proper CORS configuration on your API
2. **Timeout errors**: Increase timeout for large drawings
3. **Invalid data**: Validate your API response format
4. **Network failures**: Implement retry logic and fallbacks

### Debug Mode

Enable debug logging:

```typescript
// In development, errors are logged to console
console.log('Loading from API:', apiUrl);
```

## Migration from Existing Systems

If you're migrating from existing drawing storage:

1. **Export existing drawings** to Excalidraw format
2. **Set up API endpoints** following the response format guidelines
3. **Update your application** to use URL parameters or programmatic loading
4. **Test thoroughly** with various drawing sizes and complexities

This implementation provides a robust foundation for loading preset Excalidraw content from any API endpoint while maintaining compatibility with existing functionality. 