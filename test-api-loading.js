#!/usr/bin/env node

/**
 * Simple test server for demonstrating API loading functionality
 * Run with: node test-api-loading.js
 * Then visit: http://localhost:3000/?apiUrl=http://localhost:8080/api/template
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Mock Excalidraw scene data
const mockSceneData = {
  elements: [
    {
      type: "rectangle",
      version: 1,
      versionNonce: 123456789,
      isDeleted: false,
      id: "test-rect-1",
      fillStyle: "hachure",
      strokeWidth: 2,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      angle: 0,
      x: 150,
      y: 150,
      strokeColor: "#1e1e1e",
      backgroundColor: "#a5d8ff",
      width: 300,
      height: 150,
      seed: 1234567890,
      groupIds: [],
      strokeSharpness: "sharp",
      boundElements: [],
      updated: Date.now(),
      link: null,
      locked: false
    },
    {
      type: "text",
      version: 1,
      versionNonce: 987654321,
      isDeleted: false,
      id: "test-text-1",
      fillStyle: "hachure",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      angle: 0,
      x: 200,
      y: 100,
      strokeColor: "#1e1e1e",
      backgroundColor: "transparent",
      width: 200,
      height: 25,
      seed: 2345678901,
      groupIds: [],
      strokeSharpness: "sharp",
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      fontSize: 20,
      fontFamily: 1,
      text: "Loaded from API!",
      baseline: 18,
      textAlign: "center",
      verticalAlign: "top",
      containerId: null,
      originalText: "Loaded from API!"
    }
  ],
  appState: {
    viewBackgroundColor: "#ffffff",
    currentItemStrokeColor: "#1e1e1e",
    currentItemBackgroundColor: "transparent",
    currentItemFillStyle: "hachure",
    currentItemStrokeWidth: 1,
    currentItemStrokeStyle: "solid",
    currentItemRoughness: 1,
    currentItemOpacity: 100,
    currentItemFontFamily: 1,
    currentItemFontSize: 20,
    currentItemTextAlign: "left",
    scrollX: 0,
    scrollY: 0,
    zoom: { value: 1 }
  },
  files: {}
};

// Create test server
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  
  console.log(`${req.method} ${url.pathname}`);

  // API endpoints
  if (url.pathname === '/api/template' || url.pathname === '/api/template/') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(mockSceneData));
    return;
  }

  if (url.pathname === '/api/template/wrapped') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      data: mockSceneData,
      timestamp: Date.now(),
      version: "1.0"
    }));
    return;
  }

  if (url.pathname === '/api/template/nested') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      scene: mockSceneData,
      metadata: {
        name: "Test Template",
        created: Date.now()
      }
    }));
    return;
  }

  // Handle POST requests with authentication
  if (url.pathname === '/api/template/auth' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: 'Authorization required' }));
        return;
      }

      try {
        const requestData = JSON.parse(body);
        console.log('Received POST data:', requestData);
        
        const enhancedScene = {
          ...mockSceneData,
          elements: mockSceneData.elements.map(el => 
            el.type === 'text' 
              ? { ...el, text: `Authenticated: ${requestData.templateId || 'default'}` }
              : el
          )
        };

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(enhancedScene));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }

  // 404 for unknown paths
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 8080;

server.listen(PORT, () => {
  console.log(`🚀 Test API server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /api/template         - Basic template');
  console.log('  GET  /api/template/wrapped - Wrapped format');
  console.log('  GET  /api/template/nested  - Nested format');
  console.log('  POST /api/template/auth    - Authenticated endpoint');
  console.log('');
  console.log('Test URLs for your Excalidraw app:');
  console.log(`  ?apiUrl=http://localhost:${PORT}/api/template`);
  console.log(`  ?apiUrl=http://localhost:${PORT}/api/template/wrapped`);
  console.log(`  ?apiUrl=http://localhost:${PORT}/api/template/nested`);
  console.log('');
  console.log('Example with authentication:');
  console.log(`  ?apiUrl=http://localhost:${PORT}/api/template/auth&apiMethod=POST&apiHeaders=%7B%22Authorization%22%3A%22Bearer%20test-token%22%7D&apiBody=%7B%22templateId%22%3A%22example%22%7D`);
  console.log('');
  console.log('Press Ctrl+C to stop the server');
});

process.on('SIGINT', () => {
  console.log('\n👋 Server stopped');
  process.exit(0);
}); 