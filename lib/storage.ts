const STORAGE_KEY = 'socialmesh_content';

// Save content – for large media, we store in IndexedDB
export function saveContent(activityId: string, content: any): void {
  if (typeof window === 'undefined') return;
  // Check if content has media and it's large (e.g., > 1MB)
  if (content.media && content.media.data && content.media.data.length > 1000000) {
    // Save media to IndexedDB
    storeMedia(activityId, content.media.data);
    // Store a reference in localStorage
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    stored[activityId] = { ...content, media: { type: content.media.type, ref: true } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } else {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    stored[activityId] = content;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  }
}

export function getContent(activityId: string): any | null {
  if (typeof window === 'undefined') return null;
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  const content = stored[activityId];
  if (!content) return null;
  // If media is a reference, retrieve from IndexedDB
  if (content.media && content.media.ref) {
    return retrieveMedia(activityId).then(data => {
      if (data) {
        return { ...content, media: { type: content.media.type, data } };
      }
      return content;
    });
  }
  return content;
}

export function getAllContent(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}

// IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SocialMeshMedia', 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('media')) {
        db.createObjectStore('media', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function storeMedia(id: string, data: string): Promise<void> {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readwrite');
      const store = tx.objectStore('media');
      const request = store.put({ id, data });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

function retrieveMedia(id: string): Promise<string | null> {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('media', 'readonly');
      const store = tx.objectStore('media');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  });
}
