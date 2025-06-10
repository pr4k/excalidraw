/**
 * Add Save to API button to Excalidraw interface
 * Run this script after Excalidraw loads
 */

function addSaveButtonToExcalidraw() {
  // Wait for Excalidraw to be fully loaded
  const checkExcalidraw = setInterval(() => {
    const excalidrawContainer = document.querySelector('.excalidraw-wrapper');
    const topRightUI = document.querySelector('.top-right-ui');
    
    if (excalidrawContainer && window.excalidrawAPI) {
      clearInterval(checkExcalidraw);
      
      // Create save button
      const saveButton = document.createElement('button');
      saveButton.innerHTML = '💾 Save';
      saveButton.className = 'save-to-api-button';
      saveButton.style.cssText = `
        margin-left: 8px;
        padding: 8px 12px;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: background-color 0.2s;
      `;
      
      saveButton.addEventListener('mouseenter', () => {
        saveButton.style.backgroundColor = '#218838';
      });
      
      saveButton.addEventListener('mouseleave', () => {
        saveButton.style.backgroundColor = '#28a745';
      });
      
      saveButton.onclick = async () => {
        const documentId = prompt('Enter Document ID to save:', 'e8ff97');
        if (!documentId || !window.excalidrawAPI) return;
        
        try {
          saveButton.disabled = true;
          saveButton.innerHTML = '⏳ Saving...';
          saveButton.style.backgroundColor = '#6c757d';
          
          // Import the save functions (assuming they're available globally or via import)
          // For now, we'll implement the save logic directly
          const saveToAPI = async (apiUrl, elements, appState, files, options = {}) => {
            const { method = 'PUT', headers = {}, timeout = 10000, documentId, userId } = options;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const payload = {
              content: { elements, appState, files }
            };
            
            if (documentId) payload.unique_id = documentId;
            if (userId) payload.user_id = userId;
            
            const response = await fetch(apiUrl, {
              method,
              headers: {
                'Content-Type': 'application/json',
                ...headers,
              },
              body: JSON.stringify(payload),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`API save failed with status ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            return { success: true, data: result };
          };
          
          const buildOrganisewiseAPIUrl = (baseUrl, documentId) => {
            return `${baseUrl}/draw/excalidraw/${documentId}`;
          };
          
          // Get current scene data
          const elements = window.excalidrawAPI.getSceneElements();
          const appState = window.excalidrawAPI.getAppState();
          const files = window.excalidrawAPI.getFiles();
          
          // Use organisewise.me API
          const apiUrl = buildOrganisewiseAPIUrl('https://prod.backend.organisewise.me', documentId);
          
          const result = await saveToAPI(apiUrl, elements, appState, files, {
            method: 'PUT',
            documentId: documentId,
            userId: 13,
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (result.success) {
            showToast(`✅ Saved successfully to ${documentId}!`, 'success');
          } else {
            showToast(`❌ Save failed: ${result.error}`, 'error');
          }
          
        } catch (error) {
          console.error('Save error:', error);
          showToast(`❌ Error: ${error.message}`, 'error');
        } finally {
          saveButton.disabled = false;
          saveButton.innerHTML = '💾 Save';
          saveButton.style.backgroundColor = '#28a745';
        }
      };
      
      // Add button to the UI
      if (topRightUI) {
        topRightUI.appendChild(saveButton);
      } else {
        // Create a container if top-right-ui doesn't exist
        const container = document.createElement('div');
        container.className = 'top-right-ui';
        container.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
        `;
        container.appendChild(saveButton);
        document.body.appendChild(container);
      }
      
      console.log('✅ Save button added to Excalidraw interface');
    }
  }, 100);
  
  // Stop checking after 10 seconds
  setTimeout(() => {
    clearInterval(checkExcalidraw);
  }, 10000);
}

function showToast(message, type = 'info') {
  // Try to use Excalidraw's toast if available
  if (window.excalidrawAPI && window.excalidrawAPI.setToast) {
    window.excalidrawAPI.setToast({ 
      message: message,
      duration: type === 'error' ? 5000 : 3000
    });
    return;
  }
  
  // Fallback to custom toast
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    z-index: 10000;
    padding: 12px 16px;
    border-radius: 6px;
    color: white;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: bold;
    max-width: 300px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    ${type === 'success' ? 'background-color: #28a745;' : 'background-color: #dc3545;'}
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, type === 'error' ? 5000 : 3000);
}

// Auto-run when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addSaveButtonToExcalidraw);
} else {
  addSaveButtonToExcalidraw();
}

// Also expose function globally for manual execution
window.addSaveButtonToExcalidraw = addSaveButtonToExcalidraw; 