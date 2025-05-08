/**
 * Mobiledoc Helpers
 * 
 * This module provides helper functions for working with Mobiledoc content.
 * It's a placeholder to fix the import error in the Lambda function.
 */

// Export an empty object as a placeholder
module.exports = {
  // Helper function to extract text from mobiledoc content
  extractTextFromMobiledoc: function(mobiledoc) {
    if (!mobiledoc) return '';
    
    try {
      // If it's already a string, return it
      if (typeof mobiledoc === 'string') return mobiledoc;
      
      // If it's an object with a content property, try to extract text
      if (mobiledoc.content) {
        return typeof mobiledoc.content === 'string' 
          ? mobiledoc.content 
          : JSON.stringify(mobiledoc.content);
      }
      
      // Default fallback
      return JSON.stringify(mobiledoc);
    } catch (e) {
      console.error('Error extracting text from mobiledoc:', e);
      return '';
    }
  },
  
  // Helper function to convert HTML to mobiledoc
  htmlToMobiledoc: function(html) {
    if (!html) return null;
    
    // Return a simple mobiledoc structure with the HTML content
    return {
      version: '0.3.1',
      markups: [],
      atoms: [],
      cards: [
        ['html', { html: html }]
      ],
      sections: [
        [10, 0]
      ]
    };
  }
};
