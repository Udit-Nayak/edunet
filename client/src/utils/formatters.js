
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return format(new Date(timestamp), 'MMM d, yyyy');
  }
};

/**
 * Format number with K, M suffixes
 */
export const formatNumber = (num) => {
  if (!num) return '0';
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Truncate text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Extract tags from text (hashtags)
 */
export const extractTags = (text) => {
  if (!text) return [];
  const regex = /#(\w+)/g;
  const matches = text.match(regex);
  return matches ? matches.map(tag => tag.substring(1)) : [];
};

/**
 * Highlight code blocks
 */
export const highlightCode = (code) => {
  // This will be used with Prism.js
  return code;
};

/**
 * Format date to readable string
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date
 */
export const formatDate = (date) => {
  if (!date) return '';
  try {
    const d = new Date(date);
    return format(d, 'MMM d, yyyy h:mm a');
  } catch {
    return '';
  }
};

/**
 * Format date to relative time (alternative to formatTimeAgo)
 * @param {Date|string} date - Date to format
 * @returns {string} - Relative time string
 */
export const formatRelativeTime = (date) => {
  return formatTimeAgo(date);
};

/**
 * Strip HTML tags from text
 * @param {string} html - HTML string
 * @returns {string} - Plain text
 */
export const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} - Initials
 */
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Sanitize and format tags
 * @param {string} tag - Tag string
 * @returns {string} - Formatted tag
 */
export const sanitizeTag = (tag) => {
  if (!tag) return '';
  return tag
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

/**
 * Parse content for mentions (@username)
 * @param {string} text - Text to parse
 * @returns {array} - Array of mentioned usernames
 */
export const extractMentions = (text) => {
  if (!text) return [];
  const regex = /@(\w+)/g;
  const matches = text.match(regex);
  return matches ? matches.map(mention => mention.substring(1)) : [];
};
