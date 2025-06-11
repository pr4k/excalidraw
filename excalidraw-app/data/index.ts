import {
  compressData,
  decompressData,
} from "@excalidraw/excalidraw/data/encode";
import {
  decryptData,
  generateEncryptionKey,
  IV_LENGTH_BYTES,
} from "@excalidraw/excalidraw/data/encryption";
import { serializeAsJSON } from "@excalidraw/excalidraw/data/json";
import { restore } from "@excalidraw/excalidraw/data/restore";
import { isInvisiblySmallElement } from "@excalidraw/element";
import { isInitializedImageElement } from "@excalidraw/element";
import { t } from "@excalidraw/excalidraw/i18n";
import { bytesToHexString } from "@excalidraw/common";

import type { UserIdleState } from "@excalidraw/common";
import type { ImportedDataState } from "@excalidraw/excalidraw/data/types";
import type { SceneBounds } from "@excalidraw/element";
import type {
  ExcalidrawElement,
  FileId,
  OrderedExcalidrawElement,
} from "@excalidraw/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
  SocketId,
} from "@excalidraw/excalidraw/types";
import type { MakeBrand } from "@excalidraw/common/utility-types";

import {
  DELETED_ELEMENT_TIMEOUT,
  FILE_UPLOAD_MAX_BYTES,
  ROOM_ID_BYTES,
} from "../app_constants";

import { encodeFilesForUpload } from "./FileManager";
import { saveFilesToFirebase } from "./firebase";

import type { WS_SUBTYPES } from "../app_constants";

export type SyncableExcalidrawElement = OrderedExcalidrawElement &
  MakeBrand<"SyncableExcalidrawElement">;

export const isSyncableElement = (
  element: OrderedExcalidrawElement,
): element is SyncableExcalidrawElement => {
  if (element.isDeleted) {
    if (element.updated > Date.now() - DELETED_ELEMENT_TIMEOUT) {
      return true;
    }
    return false;
  }
  return !isInvisiblySmallElement(element);
};

export const getSyncableElements = (
  elements: readonly OrderedExcalidrawElement[],
) =>
  elements.filter((element) =>
    isSyncableElement(element),
  ) as SyncableExcalidrawElement[];

const BACKEND_V2_GET = import.meta.env.VITE_APP_BACKEND_V2_GET_URL;
const BACKEND_V2_POST = import.meta.env.VITE_APP_BACKEND_V2_POST_URL;

const generateRoomId = async () => {
  const buffer = new Uint8Array(ROOM_ID_BYTES);
  window.crypto.getRandomValues(buffer);
  return bytesToHexString(buffer);
};

export type EncryptedData = {
  data: ArrayBuffer;
  iv: Uint8Array;
};

export type SocketUpdateDataSource = {
  INVALID_RESPONSE: {
    type: WS_SUBTYPES.INVALID_RESPONSE;
  };
  SCENE_INIT: {
    type: WS_SUBTYPES.INIT;
    payload: {
      elements: readonly ExcalidrawElement[];
    };
  };
  SCENE_UPDATE: {
    type: WS_SUBTYPES.UPDATE;
    payload: {
      elements: readonly ExcalidrawElement[];
    };
  };
  MOUSE_LOCATION: {
    type: WS_SUBTYPES.MOUSE_LOCATION;
    payload: {
      socketId: SocketId;
      pointer: { x: number; y: number; tool: "pointer" | "laser" };
      button: "down" | "up";
      selectedElementIds: AppState["selectedElementIds"];
      username: string;
    };
  };
  USER_VISIBLE_SCENE_BOUNDS: {
    type: WS_SUBTYPES.USER_VISIBLE_SCENE_BOUNDS;
    payload: {
      socketId: SocketId;
      username: string;
      sceneBounds: SceneBounds;
    };
  };
  IDLE_STATUS: {
    type: WS_SUBTYPES.IDLE_STATUS;
    payload: {
      socketId: SocketId;
      userState: UserIdleState;
      username: string;
    };
  };
};

export type SocketUpdateDataIncoming =
  SocketUpdateDataSource[keyof SocketUpdateDataSource];

export type SocketUpdateData =
  SocketUpdateDataSource[keyof SocketUpdateDataSource] & {
    _brand: "socketUpdateData";
  };

const RE_COLLAB_LINK = /^#room=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/;

export const isCollaborationLink = (link: string) => {
  const hash = new URL(link).hash;
  return RE_COLLAB_LINK.test(hash);
};

export const getCollaborationLinkData = (link: string) => {
  const hash = new URL(link).hash;
  const match = hash.match(RE_COLLAB_LINK);
  if (match && match[2].length !== 22) {
    window.alert(t("alerts.invalidEncryptionKey"));
    return null;
  }
  return match ? { roomId: match[1], roomKey: match[2] } : null;
};

export const generateCollaborationLinkData = async () => {
  const roomId = await generateRoomId();
  const roomKey = await generateEncryptionKey();

  if (!roomKey) {
    throw new Error("Couldn't generate room key");
  }

  return { roomId, roomKey };
};

export const getCollaborationLink = (data: {
  roomId: string;
  roomKey: string;
}) => {
  return `${window.location.origin}${window.location.pathname}#room=${data.roomId},${data.roomKey}`;
};

/**
 * Decodes shareLink data using the legacy buffer format.
 * @deprecated
 */
const legacy_decodeFromBackend = async ({
  buffer,
  decryptionKey,
}: {
  buffer: ArrayBuffer;
  decryptionKey: string;
}) => {
  let decrypted: ArrayBuffer;

  try {
    // Buffer should contain both the IV (fixed length) and encrypted data
    const iv = buffer.slice(0, IV_LENGTH_BYTES);
    const encrypted = buffer.slice(IV_LENGTH_BYTES, buffer.byteLength);
    decrypted = await decryptData(new Uint8Array(iv), encrypted, decryptionKey);
  } catch (error: any) {
    // Fixed IV (old format, backward compatibility)
    const fixedIv = new Uint8Array(IV_LENGTH_BYTES);
    decrypted = await decryptData(fixedIv, buffer, decryptionKey);
  }

  // We need to convert the decrypted array buffer to a string
  const string = new window.TextDecoder("utf-8").decode(
    new Uint8Array(decrypted),
  );
  const data: ImportedDataState = JSON.parse(string);

  return {
    elements: data.elements || null,
    appState: data.appState || null,
  };
};

const importFromBackend = async (
  id: string,
  decryptionKey: string,
): Promise<ImportedDataState> => {
  try {
    const response = await fetch(`${BACKEND_V2_GET}${id}`);

    if (!response.ok) {
      window.alert(t("alerts.importBackendFailed"));
      return {};
    }
    const buffer = await response.arrayBuffer();

    try {
      const { data: decodedBuffer } = await decompressData(
        new Uint8Array(buffer),
        {
          decryptionKey,
        },
      );
      const data: ImportedDataState = JSON.parse(
        new TextDecoder().decode(decodedBuffer),
      );

      return {
        elements: data.elements || null,
        appState: data.appState || null,
      };
    } catch (error: any) {
      console.warn(
        "error when decoding shareLink data using the new format:",
        error,
      );
      return legacy_decodeFromBackend({ buffer, decryptionKey });
    }
  } catch (error: any) {
    window.alert(t("alerts.importBackendFailed"));
    console.error(error);
    return {};
  }
};

export const loadScene = async (
  id: string | null,
  privateKey: string | null,
  // Supply local state even if importing from backend to ensure we restore
  // localStorage user settings which we do not persist on server.
  // Non-optional so we don't forget to pass it even if `undefined`.
  localDataState: ImportedDataState | undefined | null,
) => {
  let data;
  if (id != null && privateKey != null) {
    // the private key is used to decrypt the content from the server, take
    // extra care not to leak it
    data = restore(
      await importFromBackend(id, privateKey),
      localDataState?.appState,
      localDataState?.elements,
      { repairBindings: true, refreshDimensions: false },
    );
  } else {
    data = restore(localDataState || null, null, null, {
      repairBindings: true,
    });
  }

  return {
    elements: data.elements,
    appState: data.appState,
    // note: this will always be empty because we're not storing files
    // in the scene database/localStorage, and instead fetch them async
    // from a different database
    files: data.files,
  };
};

/**
 * Load Excalidraw scene data from organisewise.me API using document ID
 * @param documentId - The document ID (e.g., 'e8ff97')
 * @param options - Optional configuration for the API request
 * @returns Promise<ImportedDataState> - The scene data compatible with Excalidraw
 */
export const loadSceneFromAPI = async (
  documentId: string,
  options?: {
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: string | FormData | URLSearchParams;
    timeout?: number;
  }
): Promise<ImportedDataState> => {
  const { method = 'GET', headers = {}, body, timeout = 10000 } = options || {};
  
  // Get base URL from environment variable or use default
  const baseUrl = (import.meta.env as any).VITE_APP_ORGANISEWISE_API_BASE_URL || 'https://prod.backend.organisewise.me';
  const apiUrl = `${baseUrl}/draw/excalidraw/${documentId}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: method === 'POST' ? body : undefined,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate that the response contains valid Excalidraw data
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid API response: expected object');
    }
    
    // Handle different API response formats
    let sceneData: ImportedDataState;
    
    if (data.elements || data.appState || data.files) {
      // Direct Excalidraw format
      sceneData = {
        elements: data.elements || [],
        appState: data.appState || {},
        files: data.files || {},
      };
    } else if (data.content) {
      // Content field format (e.g., organisewise.me API)
      sceneData = {
        elements: data.content.elements || [],
        appState: data.content.appState || {},
        files: data.content.files || {},
      };
    } else if (data.scene) {
      // Nested scene format
      sceneData = {
        elements: data.scene.elements || [],
        appState: data.scene.appState || {},
        files: data.scene.files || {},
      };
    } else if (data.data) {
      // Wrapped data format
      sceneData = {
        elements: data.data.elements || [],
        appState: data.data.appState || {},
        files: data.data.files || {},
      };
    } else {
      // Assume the entire response is the scene data
      sceneData = {
        elements: data.elements || [],
        appState: data.appState || {},
        files: data.files || {},
      };
    }
    
    return sceneData;
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error(`API request timed out after ${timeout}ms`);
    }
    
    console.error('Failed to load scene from API:', error);
    throw new Error(`Failed to load scene from API: ${error.message}`);
  }
};

/**
 * Enhanced scene loader that supports API loading via URL parameters with document ID
 * @param id - Backend scene ID (existing functionality)
 * @param privateKey - Decryption key for backend scenes (existing functionality) 
 * @param localDataState - Local storage data for fallback
 * @param documentId - Optional document ID to load scene from organisewise API
 * @param apiOptions - Optional configuration for API requests
 */
export const loadSceneEnhanced = async (
  id: string | null,
  privateKey: string | null,
  localDataState: ImportedDataState | undefined | null,
  documentId?: string,
  apiOptions?: Parameters<typeof loadSceneFromAPI>[1]
) => {
  let data;
  
  // Priority 1: Load from API if document ID is provided
  if (documentId) {
    try {
      const apiData = await loadSceneFromAPI(documentId, apiOptions);
      data = restore(
        apiData,
        localDataState?.appState,
        localDataState?.elements,
        { repairBindings: true, refreshDimensions: false }
      );
    } catch (error: any) {
      console.error('Failed to load from API, falling back to default loading:', error);
      // Fall through to existing loading logic
    }
  }
  
  // Priority 2: Load from backend (existing functionality)
  if (!data && id != null && privateKey != null) {
    data = restore(
      await importFromBackend(id, privateKey),
      localDataState?.appState,
      localDataState?.elements,
      { repairBindings: true, refreshDimensions: false },
    );
  }
  
  // Priority 3: Load from local storage (existing functionality)
  if (!data) {
    data = restore(localDataState || null, null, null, {
      repairBindings: true,
    });
  }

  return {
    elements: data.elements,
    appState: data.appState,
    files: data.files,
  };
};

/**
 * Save Excalidraw scene data to organisewise.me API using document ID
 * @param documentId - The document ID to save to
 * @param elements - Excalidraw elements to save
 * @param appState - Excalidraw app state to save
 * @param files - Excalidraw files to save
 * @param options - Optional configuration for the API request
 * @returns Promise<{success: boolean; error?: string}> - Success status
 */
export const saveSceneToAPI = async (
  documentId: string,
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles = {},
  options?: {
    method?: 'PUT' | 'POST';
    headers?: Record<string, string>;
    timeout?: number;
    userId?: number;
  }
): Promise<{ success: boolean; error?: string }> => {
  const { 
    method = 'PUT', 
    headers = {}, 
    timeout = 10000,
    userId 
  } = options || {};
  
  // Get base URL from environment variable or use default
  const baseUrl = (import.meta.env as any).VITE_APP_ORGANISEWISE_API_BASE_URL || 'https://prod.backend.organisewise.me';
  const apiUrl = `${baseUrl}/draw/excalidraw/${documentId}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Prepare the payload in the format expected by the API
    const payload: {
      content: {
        elements: readonly ExcalidrawElement[];
        appState: Partial<AppState>;
        files: BinaryFiles;
      };
      unique_id?: string;
      user_id?: number;
    } = {
      content: {
        elements,
        appState,
        files
      }
    };
    
    // Add additional fields if provided (for organisewise.me format)
    if (documentId) {
      payload.unique_id = documentId;
    }
    if (userId) {
      payload.user_id = userId;
    }
    
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
    
    return { success: true };
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { 
        success: false, 
        error: `Save request timed out after ${timeout}ms` 
      };
    }
    
    console.error('Failed to save scene to API:', error);
    return { 
      success: false, 
      error: `Failed to save to API: ${error.message}` 
    };
  }
};

/**
 * Helper function to construct API URL for organisewise.me format
 * @param documentId - Document ID to save to
 * @returns Complete API URL
 * @deprecated Use saveSceneToAPI or loadSceneFromAPI directly with document ID
 */
export const buildOrganisewiseAPIUrl = (baseUrl: string, documentId: string): string => {
  return `${baseUrl}/draw/excalidraw/${documentId}`;
};

type ExportToBackendResult =
  | { url: null; errorMessage: string }
  | { url: string; errorMessage: null };

export const exportToBackend = async (
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
): Promise<ExportToBackendResult> => {
  const encryptionKey = await generateEncryptionKey("string");

  const payload = await compressData(
    new TextEncoder().encode(
      serializeAsJSON(elements, appState, files, "database"),
    ),
    { encryptionKey },
  );

  try {
    const filesMap = new Map<FileId, BinaryFileData>();
    for (const element of elements) {
      if (isInitializedImageElement(element) && files[element.fileId]) {
        filesMap.set(element.fileId, files[element.fileId]);
      }
    }

    const filesToUpload = await encodeFilesForUpload({
      files: filesMap,
      encryptionKey,
      maxBytes: FILE_UPLOAD_MAX_BYTES,
    });

    const response = await fetch(BACKEND_V2_POST, {
      method: "POST",
      body: payload.buffer as ArrayBuffer,
    });
    const json = await response.json();
    if (json.id) {
      const url = new URL(window.location.href);
      // We need to store the key (and less importantly the id) as hash instead
      // of queryParam in order to never send it to the server
      url.hash = `json=${json.id},${encryptionKey}`;
      const urlString = url.toString();

      await saveFilesToFirebase({
        prefix: `/files/shareLinks/${json.id}`,
        files: filesToUpload,
      });

      return { url: urlString, errorMessage: null };
    } else if (json.error_class === "RequestTooLargeError") {
      return {
        url: null,
        errorMessage: t("alerts.couldNotCreateShareableLinkTooBig"),
      };
    }

    return { url: null, errorMessage: t("alerts.couldNotCreateShareableLink") };
  } catch (error: any) {
    console.error(error);

    return { url: null, errorMessage: t("alerts.couldNotCreateShareableLink") };
  }
};
