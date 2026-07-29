// lib/storage.ts

const STORAGE_KEY = 'socialmesh_content';

export function saveContent(activityId: string, content: any): void {
  if (typeof window === 'undefined') return;
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  stored[activityId] = content;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function getContent(activityId: string): any | null {
  if (typeof window === 'undefined') return null;
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  return stored[activityId] || null;
}

export function getAllContent(): Record<string, any> {
  if (typeof window === 'undefined') return {};
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
}
