#!/usr/bin/env node

/**
 * Test script for loading from organisewise.me API
 * Run with: node test-organisewise-api.js
 * Then visit your Excalidraw app with the generated URL
 */

const http = require('http');

// Test the organisewise API format
const testOrganisewiseAPI = async () => {
  console.log('🧪 Testing organisewise.me API format...');
  
  try {
    // Note: In a real browser environment, you'd use fetch()
    // This is just to demonstrate the API structure
    
    const apiUrl = 'https://prod.backend.organisewise.me/draw/excalidraw/e8ff97';
    
    console.log('📡 API URL:', apiUrl);
    console.log('');
    console.log('✅ Your Excalidraw URL should be:');
    console.log(`https://your-excalidraw-app.com/?apiUrl=${encodeURIComponent(apiUrl)}`);
    console.log('');
    
    // Example of what the API returns (based on the provided data)
    const expectedFormat = {
      "id": 141,
      "unique_id": "e8ff97",
      "content": {
        "appState": "{ ... excalidraw app state ... }",
        "elements": "[ ... excalidraw elements ... ]"
      },
      "note_id": null,
      "user_id": 13
    };
    
    console.log('📋 Expected API response format:');
    console.log(JSON.stringify(expectedFormat, null, 2));
    console.log('');
    
    console.log('🔧 The loadSceneFromAPI function will extract:');
    console.log('  - elements: data.content.elements');
    console.log('  - appState: data.content.appState');
    console.log('  - files: data.content.files (if present)');
    console.log('');
    
    // Create a simple proxy server to test CORS if needed
    console.log('🌐 If you encounter CORS issues, you can use this test server as a proxy:');
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
};

// Simple CORS proxy server (if needed)
const createCORSProxy = () => {
  // In-memory storage for demonstration
  let storedContent = {
    "e8ff97": {
      "id": 141,
      "unique_id": "e8ff97",
      "content": {
        "appState": {
          "viewBackgroundColor": "#ffffff",
          "currentItemStrokeColor": "#000000",
          "zoom": { "value": 1 }
        },
        "elements": [
          {
            "type": "text",
            "id": "demo-text",
            "x": 100,
            "y": 100,
            "width": 200,
            "height": 25,
            "text": "Loaded from organisewise.me!",
            "fontSize": 20,
            "fontFamily": 1,
            "strokeColor": "#000000",
            "backgroundColor": "transparent",
            "fillStyle": "hachure",
            "strokeWidth": 1,
            "roughness": 1,
            "opacity": 100,
            "version": 1,
            "versionNonce": Date.now(),
            "isDeleted": false,
            "groupIds": [],
            "strokeSharpness": "sharp",
            "seed": Math.floor(Math.random() * 1000000),
            "updated": Date.now(),
            "link": null,
            "locked": false,
            "baseline": 18,
            "textAlign": "left",
            "verticalAlign": "top",
            "containerId": null,
            "originalText": "Loaded from organisewise.me!"
          }
        ]
      },
      "note_id": null,
      "user_id": 13
    }
  };

  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Handle organisewise API format: /proxy/organisewise/:documentId
    const orgMatch = url.pathname.match(/^\/proxy\/organisewise\/(.+)$/);
    
    if (orgMatch) {
      const documentId = orgMatch[1];
      
      if (req.method === 'GET') {
        // Load existing content
        try {
          console.log(`📥 GET request for document: ${documentId}`);
          
          const content = storedContent[documentId];
          if (!content) {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Document not found' }));
            return;
          }

          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify(content));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: 'Failed to load document' }));
        }
        return;
      }
      
      if (req.method === 'PUT') {
        // Save content
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          try {
            console.log(`💾 PUT request for document: ${documentId}`);
            console.log('📄 Request body length:', body.length, 'bytes');
            
            const requestData = JSON.parse(body);
            console.log('📋 Received data structure:', {
              hasContent: !!requestData.content,
              hasElements: !!requestData.content?.elements,
              hasAppState: !!requestData.content?.appState,
              elementsCount: requestData.content?.elements?.length || 0,
              uniqueId: requestData.unique_id,
              userId: requestData.user_id
            });
            
            // Store the content
            storedContent[documentId] = {
              id: storedContent[documentId]?.id || Math.floor(Math.random() * 1000),
              unique_id: documentId,
              content: requestData.content,
              note_id: requestData.note_id || null,
              user_id: requestData.user_id || storedContent[documentId]?.user_id || 13,
              updated_at: new Date().toISOString()
            };
            
            console.log(`✅ Successfully saved document ${documentId}`);
            
            // Return success response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              message: 'Document saved successfully',
              document_id: documentId,
              timestamp: new Date().toISOString()
            }));
            
          } catch (error) {
            console.error('❌ Error saving document:', error.message);
            res.writeHead(400);
            res.end(JSON.stringify({ 
              error: 'Invalid JSON or save failed',
              details: error.message 
            }));
          }
        });
        return;
      }
    }
    
    // Legacy proxy endpoint (backwards compatibility)
    if (url.pathname === '/proxy/organisewise') {
      try {
        console.log('🔄 Legacy proxy request...');
        
        const mockResponse = storedContent['e8ff97'];

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(mockResponse));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: 'Proxy error' }));
      }
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  const PORT = 8081;
  server.listen(PORT, () => {
    console.log(`🔀 CORS Proxy server running on http://localhost:${PORT}`);
    console.log('');
    console.log('🧪 Available endpoints:');
    console.log(`  GET  http://localhost:${PORT}/proxy/organisewise/e8ff97 - Load document`);
    console.log(`  PUT  http://localhost:${PORT}/proxy/organisewise/e8ff97 - Save document`);
    console.log(`  GET  http://localhost:${PORT}/proxy/organisewise/YOUR_ID - Load your document`);
    console.log(`  PUT  http://localhost:${PORT}/proxy/organisewise/YOUR_ID - Save your document`);
    console.log('');
    console.log('🔗 Test URLs for Excalidraw:');
    console.log(`  Load: ?apiUrl=http://localhost:${PORT}/proxy/organisewise/e8ff97`);
    console.log(`  Save: Use the ApiSaver component with base URL: http://localhost:${PORT}/proxy/organisewise`);
    console.log('');
    console.log('Press Ctrl+C to stop');
  });

  process.on('SIGINT', () => {
    console.log('\n👋 Proxy server stopped');
    process.exit(0);
  });
};

// Run the test
console.log('🚀 Organisewise.me API Integration Test');
console.log('=====================================');
console.log('');

testOrganisewiseAPI();

console.log('💡 Options:');
console.log('  1. Use the URL directly (if CORS allows)');
console.log('  2. Start CORS proxy with: node test-organisewise-api.js --proxy');
console.log('');

if (process.argv.includes('--proxy')) {
  createCORSProxy();
} else {
  console.log('Add --proxy flag to start a CORS proxy server');
} 