# Excalidraw API Loading Guide

## Updated: Simplified Document ID Approach

The API loading functionality has been updated to use a simplified approach that only requires a **document ID** instead of a full API URL.

### Environment Configuration

Set the base URL in your environment variables:

```bash
# .env file or environment variables
VITE_APP_ORGANISEWISE_API_BASE_URL=https://prod.backend.organisewise.me
```

If not set, it defaults to `https://prod.backend.organisewise.me`.

### URL Parameters (New Simplified Format)

#### Loading a Document
- `documentId` or `document_id` - The document ID (e.g., `e8ff97`)

#### Collaboration Mode
- `collaborationMode` or `collaboration_mode` - Set to `true` to automatically start collaboration mode

**Example URLs:**
```
# Load document with ID 'e8ff97'
https://your-excalidraw.com/?documentId=e8ff97

# Alternative parameter name
https://your-excalidraw.com/?document_id=abc123

# Start in collaboration mode
https://your-excalidraw.com/?collaborationMode=true

# Load document and start collaboration
https://your-excalidraw.com/?documentId=e8ff97&collaborationMode=true

# Start collaboration first, then manually set document ID for saving
https://your-excalidraw.com/?collaborationMode=true

# Join existing collaboration room (preserves document ID)
https://your-excalidraw.com/?documentId=e8ff97&collaborationMode=true#room=abc123,def456

# With additional API options
https://your-excalidraw.com/?documentId=e8ff97&apiMethod=GET&apiTimeout=5000
```

#### API Options (Optional)
- `apiMethod` or `api_method` - HTTP method (default: 'GET')
- `apiHeaders` or `api_headers` - JSON string of headers (URL encoded)
- `apiBody` or `api_body` - Request body (URL encoded)
- `apiTimeout` or `api_timeout` - Timeout in milliseconds (default: 10000)

### Document State Management

When a document is loaded via `documentId`, the system automatically:
1. Stores the document ID in React state
2. Exposes it to `window.currentDocumentId` for the save functionality
3. Uses the stored ID for subsequent save operations

### Save Functionality

The save button will:
1. First check if there's a stored `documentId` from the URL
2. If not found, prompt the user to enter a document ID
3. Save using the simplified API format

### API Response Format

The system supports multiple response formats:

```javascript
// Format 1: organisewise.me format (recommended)
{
  "id": 141,
  "unique_id": "e8ff97",
  "content": {
    "elements": [...],
    "appState": {...},
    "files": {...}
  },
  "user_id": 13
}

// Format 2: Direct Excalidraw format
{
  "elements": [...],
  "appState": {...},
  "files": {...}
}

// Format 3: Nested scene format
{
  "scene": {
    "elements": [...],
    "appState": {...},
    "files": {...}
  }
}
```

### Technical Implementation

#### Loading Function
```typescript
// New simplified function signature
loadSceneFromAPI(documentId: string, options?: {...})

// Usage
const scene = await loadSceneFromAPI('e8ff97');
```

#### Save Function
```typescript
// New simplified function signature
saveSceneToAPI(documentId: string, elements, appState, files, options?: {...})

// Usage
const result = await saveSceneToAPI('e8ff97', elements, appState, files, {
  userId: 13
});
```

### Migration from Previous Version

If you were using the old `apiUrl` parameter format:

**Old format:**
```
?apiUrl=https://prod.backend.organisewise.me/draw/excalidraw/e8ff97
```

**New format:**
```
?documentId=e8ff97
```

The new format is much cleaner and automatically handles the API URL construction.

---

## Complete API Loading and Saving Guide

This guide explains how to integrate Excalidraw with external APIs for loading and saving drawing data.

### Collaboration Mode

When `collaborationMode=true` is set in the URL:

1. **Automatic Room Creation**: Excalidraw automatically generates a new collaboration room
2. **URL Update**: The browser URL is updated to include the collaboration room ID and encryption key
3. **Document ID Preservation**: Any `documentId` parameter is preserved in the collaboration URL
4. **Shareable Link**: The updated URL can be shared with others to join the same collaboration session
5. **Consistent Saving**: All participants save to the same document ID automatically

**How it works:**
- If no existing collaboration room is detected in the URL, a new room is created
- **Document content is loaded first** from the API if a documentId is provided
- The room data (ID and encryption key) is added to the URL hash
- The `documentId` parameter is preserved in the URL query parameters
- **Loaded content is automatically synced** to the collaboration room
- The collaboration session starts immediately
- Other users can join by visiting the same URL and will use the same document ID

**Document Loading + Collaboration Flow:**
1. **Load Phase**: Document content is fetched from API first
2. **Collaboration Phase**: Room is created and content is synced to all participants
3. **Sync Phase**: Initial content is broadcast to ensure all collaborators see the same data
4. **Real-time Phase**: Normal collaboration features continue

**Document ID Persistence:**
- When collaboration mode is activated, the `documentId` is automatically preserved
- All collaborators see and use the same document ID for saving
- The save button automatically uses the shared document ID
- No manual entry required for collaborators joining the session
- **Initial document content is loaded and shared** across all participants

**Security:**
- Each collaboration room has a unique encryption key
- All data is encrypted before being transmitted
- Room URLs are secure and cannot be guessed

**Example workflow:**
1. Visit: `https://your-excalidraw.com/?documentId=abc123&collaborationMode=true`
2. URL becomes: `https://your-excalidraw.com/?documentId=abc123&collaborationMode=true#room=xyz789,def456`
3. Share the updated URL with collaborators
4. Everyone who visits the URL joins the same drawing session AND saves to document ID "abc123"
5. All saves across all collaborators go to the same document