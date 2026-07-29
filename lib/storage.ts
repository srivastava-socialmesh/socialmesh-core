// lib/storage.ts

const STORAGE_KEY = 'socialmesh_content';

// Save content for an activity (post, comment, like, etc.)
export function saveContent(activityId: string, content: any): void {
  if (typeof window === 'undefined') return; // Skip on server
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  stored[activityId] = content;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

// Retrieve content by activity ID
export function getContent(activityId: string): any | null {
  if (typeof window === 'undefined') return null;
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return stored[activityId] || null;
}

// Get all stored content (for debugging)
export function getAllContent(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}
