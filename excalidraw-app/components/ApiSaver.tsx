import React, { useState } from 'react';
import { saveSceneToAPI, buildOrganisewiseAPIUrl } from '../data';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';

interface ApiSaverProps {
  excalidrawAPI: ExcalidrawImperativeAPI | null;
}

/**
 * Component for saving Excalidraw content to API endpoints
 */
export const ApiSaver: React.FC<ApiSaverProps> = ({ excalidrawAPI }) => {
  const [documentId, setDocumentId] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://prod.backend.organisewise.me');
  const [userId, setUserId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [lastSaveStatus, setLastSaveStatus] = useState<{
    success: boolean;
    message: string;
    timestamp: Date;
  } | null>(null);

  const saveToApi = async () => {
    if (!documentId.trim() || !excalidrawAPI) {
      setLastSaveStatus({
        success: false,
        message: 'Document ID is required',
        timestamp: new Date()
      });
      return;
    }
    
    setSaving(true);
    setLastSaveStatus(null);
    
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      
      // Build the API URL
      const apiUrl = buildOrganisewiseAPIUrl(baseUrl, documentId.trim());
      
      const result = await saveSceneToAPI(apiUrl, elements, appState, files, {
        method: 'PUT',
        documentId: documentId.trim(),
        userId: userId ? parseInt(userId, 10) : undefined,
        headers: {
          'Content-Type': 'application/json',
          // Add any authentication headers here if needed
          // 'Authorization': 'Bearer YOUR_TOKEN'
        }
      });
      
      if (result.success) {
        setLastSaveStatus({
          success: true,
          message: `Saved successfully to ${documentId}`,
          timestamp: new Date()
        });
      } else {
        setLastSaveStatus({
          success: false,
          message: result.error || 'Save failed',
          timestamp: new Date()
        });
      }
      
    } catch (error: any) {
      setLastSaveStatus({
        success: false,
        message: error.message || 'Unexpected error occurred',
        timestamp: new Date()
      });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !saving) {
      saveToApi();
    }
  };

  return (
    <div style={{ 
      padding: '12px', 
      borderTop: '1px solid #ddd',
      backgroundColor: '#f8f9fa',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold' }}>
        💾 Save the Note
      </div>
      
      {/* Base URL Input */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
          Base URL:
        </label>
        <input
          type="text"
          placeholder="https://prod.backend.organisewise.me"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          disabled={saving}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '13px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Document ID Input */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
          Document ID: <span style={{ color: '#dc3545' }}>*</span>
        </label>
        <input
          type="text"
          placeholder="e.g., e8ff97"
          value={documentId}
          onChange={(e) => setDocumentId(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={saving}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '13px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* User ID Input (Optional) */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#666' }}>
          User ID (optional):
        </label>
        <input
          type="number"
          placeholder="e.g., 13"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          disabled={saving}
          style={{
            width: '100%',
            padding: '6px 10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '13px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Save Button */}
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={saveToApi}
          disabled={!documentId.trim() || saving || !excalidrawAPI}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: saving ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: (!documentId.trim() || saving || !excalidrawAPI) ? 0.6 : 1,
            transition: 'background-color 0.2s'
          }}
        >
          {saving ? '⏳ Saving...' : '💾 Save to API'}
        </button>
      </div>

      {/* Status Display */}
      {lastSaveStatus && (
        <div style={{ 
          marginTop: '8px',
          padding: '6px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          backgroundColor: lastSaveStatus.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${lastSaveStatus.success ? '#c3e6cb' : '#f5c6cb'}`,
          color: lastSaveStatus.success ? '#155724' : '#721c24'
        }}>
          <div style={{ fontWeight: 'bold' }}>
            {lastSaveStatus.success ? '✅' : '❌'} {lastSaveStatus.message}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            {lastSaveStatus.timestamp.toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* API URL Preview */}
      {documentId.trim() && (
        <div style={{ 
          marginTop: '8px', 
          fontSize: '11px', 
          color: '#6c757d',
          background: '#fff',
          padding: '4px 6px',
          border: '1px solid #dee2e6',
          borderRadius: '3px',
          wordBreak: 'break-all'
        }}>
          <strong>API URL:</strong> {buildOrganisewiseAPIUrl(baseUrl, documentId.trim())}
        </div>
      )}

      <div style={{ 
        marginTop: '8px', 
        fontSize: '11px', 
        color: '#6c757d' 
      }}>
        💡 This will send a PUT request with your drawing data
      </div>
    </div>
  );
}; 