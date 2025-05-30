/**
 * Text Utility Functions for Geopolitical Risk Sensor
 */

/**
 * Calculate similarity between two strings using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity score between 0 and 1
 */
function similarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  // Convert to lowercase for case-insensitive comparison
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  // Calculate Levenshtein distance
  const track = Array(s2.length + 1).fill(null).map(() => 
    Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i += 1) {
    track[0][i] = i;
  }
  
  for (let j = 0; j <= s2.length; j += 1) {
    track[j][0] = j;
  }
  
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  
  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  
  // Return similarity score (1 - normalized distance)
  return 1 - distance / maxLength;
}

/**
 * Extract keywords from text
 * @param {string} text - Text to extract keywords from
 * @returns {Array} - Array of keywords
 */
function extractKeywords(text) {
  if (!text) return [];
  
  // Remove common stop words
  const stopWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
    'their', 'we', 'our', 'you', 'your', 'he', 'she', 'his', 'her'
  ];
  
  // Tokenize and filter
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split by whitespace
    .filter(word => word.length > 2) // Only words longer than 2 chars
    .filter(word => !stopWords.includes(word)); // Remove stop words
  
  // Count word frequency
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Sort by frequency
  const sortedWords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Return top keywords (up to 10)
  return sortedWords.slice(0, 10);
}

/**
 * Summarize text to a specified length
 * @param {string} text - Text to summarize
 * @param {number} maxLength - Maximum length of summary
 * @returns {string} - Summarized text
 */
function summarizeText(text, maxLength = 150) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  // Simple truncation with ellipsis
  return text.substring(0, maxLength) + '...';
}

module.exports = {
  similarity,
  extractKeywords,
  summarizeText
};
