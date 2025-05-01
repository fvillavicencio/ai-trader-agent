/**
 * Mobiledoc Helper Functions
 * Utility functions for working with the Ghost mobiledoc format
 */

/**
 * Adds a heading to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add the heading to
 * @param {string} text - The heading text
 * @param {number} level - The heading level (1-6)
 */
const addHeading = (mobiledoc, text, level = 2) => {
  mobiledoc.sections.push([1, `h${level}`, [[0, [], 0, text]]]);
};

/**
 * Adds a paragraph to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add the paragraph to
 * @param {string} text - The paragraph text
 */
const addParagraph = (mobiledoc, text) => {
  mobiledoc.sections.push([1, 'p', [[0, [], 0, text]]]);
};

/**
 * Adds HTML content to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add the HTML to
 * @param {string} html - The HTML content
 */
const addHTML = (mobiledoc, html) => {
  mobiledoc.cards.push(['html', { html }]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

/**
 * Adds a divider to the mobiledoc
 * @param {object} mobiledoc - The mobiledoc object to add the divider to
 */
const addDivider = (mobiledoc) => {
  mobiledoc.cards.push(['hr', {}]);
  mobiledoc.sections.push([10, mobiledoc.cards.length - 1]);
};

/**
 * Formats a number with commas for thousands
 * @param {number} num - The number to format
 * @returns {string} - The formatted number string
 */
const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * Formats a currency value
 * @param {number} value - The value to format
 * @returns {string} - The formatted currency string
 */
const formatCurrency = (value) => {
  if (value >= 1e12) {
    return `$${(value / 1e12).toFixed(2)}T`;
  } else if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else {
    return `$${formatNumber(value)}`;
  }
};

module.exports = {
  addHeading,
  addParagraph,
  addHTML,
  addDivider,
  formatNumber,
  formatCurrency
};
