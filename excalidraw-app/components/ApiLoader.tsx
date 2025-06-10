import React, { useState } from 'react';
import { loadSceneFromAPI } from '../data';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

interface ApiLoaderProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

/**
 * Component demonstrating how to load preset Excalidraw content from APIs
 */
export const ApiLoader: React.FC<ApiLoaderProps> = ({ excalidrawAPI }) => {
  const [apiUrl, setApiUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromApi = async () => {
    if (!apiUrl.trim() || !excalidrawAPI) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const sceneData = await loadSceneFromAPI(apiUrl.trim());
      
      // Load the scene into Excalidraw
      excalidrawAPI.updateScene({
        elements: sceneData.elements || [],
        appState: {
          ...excalidrawAPI.getAppState(),
          ...sceneData.appState,
        },
      });
      
      // Optionally zoom to fit content
      if (sceneData.elements && sceneData.elements.length > 0) {
        excalidrawAPI.scrollToContent(sceneData.elements, {
          fitToViewport: true,
          animate: true,
        });
      }
      
      setApiUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to load from API');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      loadFromApi();
    }
  };

  return (
    <div style={{ 
      padding: '10px', 
      borderTop: '1px solid #ddd',
      backgroundColor: '#f8f9fa'
    }}>
      <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
        Load from API
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Enter API URL..."
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        />
        <button
          onClick={loadFromApi}
          disabled={!apiUrl.trim() || loading || !excalidrawAPI}
          style={{
            padding: '6px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: (!apiUrl.trim() || loading || !excalidrawAPI) ? 0.6 : 1,
          }}
        >
          {loading ? 'Loading...' : 'Load'}
        </button>
      </div>
      {error && (
        <div style={{ 
          marginTop: '8px', 
          color: '#dc3545', 
          fontSize: '12px',
          padding: '4px 6px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
        }}>
          {error}
        </div>
      )}
      <div style={{ 
        marginTop: '8px', 
        fontSize: '11px', 
        color: '#6c757d' 
      }}>
        Or use URL parameters: ?apiUrl=https://api.example.com/scene
      </div>
    </div>
  );
}; 