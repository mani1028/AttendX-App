import type { Subject } from './types';

export const formatDate = (dateString?: string): string => {
  if (!dateString) {
    return '—';
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) {
    return '—';
  }
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export const filterSubjectsBySearch = (subjects: Subject[], searchTerm: string): Subject[] => {
  if (!searchTerm.trim()) {
    return subjects;
  }
  const term = searchTerm.toLowerCase();
  return subjects
    .map((sub) => ({
      ...sub,
      papers: sub.papers.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          (p.teacher_name || '').toLowerCase().includes(term),
      ),
    }))
    .filter((sub) => sub.papers.length > 0);
};
