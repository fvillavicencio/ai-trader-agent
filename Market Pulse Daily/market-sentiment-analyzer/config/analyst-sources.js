/**
 * Analyst Sources Configuration
 * Contains structured data about all analyst sources for Market Pulse Daily
 */

// Analyst source configuration based on the unified source catalog
const ANALYST_SOURCES = {
  dan_nathan: {
    name: "Dan Nathan",
    feeds: [
      { name: "RiskReversal Blog", url: "https://riskreversal.com/feed", type: "rss", priority: "high" },
      { name: "RiskReversal Substack", url: "https://riskreversal.substack.com/feed", type: "rss", priority: "medium" },
      { name: "On The Tape Podcast", url: "https://podcasts.apple.com/us/podcast/on-the-tape/id1545205930", type: "rss_audio", priority: "high" },
      { name: "MRKT Call Podcast", url: "https://podcasts.apple.com/us/podcast/mrkt-call/id1686715185", type: "rss_audio", priority: "medium" },
      { name: "RiskReversal YouTube", url: "https://www.youtube.com/@RiskReversalMedia", type: "youtube_api", priority: "high" },
      { name: "X/Twitter", url: "https://twitter.com/RiskReversal", type: "twitter", priority: "medium" },
      { name: "CNBC Fast Money", url: "https://www.cnbc.com/fast-money", type: "cnbc_html", priority: "medium" },
      { name: "CNBC Options Action", url: "https://www.cnbc.com/options-action", type: "cnbc_html", priority: "low" }
    ]
  },
  josh_brown: {
    name: "Josh Brown",
    feeds: [
      { name: "The Compound & Friends", url: "https://feed.pippa.io/public/shows/5c1d3a90e6bc692c38b2221f", type: "rss_audio", priority: "high" },
      { name: "Ask The Compound", url: "https://feeds.megaphone.fm/askthecompound", type: "rss_audio", priority: "high" },
      { name: "The Compound YouTube", url: "https://www.youtube.com/c/TheCompoundRWM", type: "youtube_api", priority: "high" },
      { name: "WAYT Playlist", url: "https://www.youtube.com/playlist?list=PLZgCX3KJ3XGDugSOCJzIrAxQxMV1osLXc", type: "youtube_api", priority: "medium" },
      { name: "X/Twitter", url: "https://twitter.com/ReformedBroker", type: "twitter", priority: "medium" },
      { name: "LinkedIn Articles", url: "https://www.linkedin.com/in/dtjb", type: "linkedin_scrape", priority: "medium" }
    ]
  },
  steve_weiss: {
    name: "Steve Weiss",
    feeds: [
      { name: "Short Hills Insights", url: "https://aum13f.com/firm/short-hills-capital-partners-llc", type: "html", priority: "high" },
      { name: "X/Twitter", url: "https://twitter.com/stephenlweiss", type: "twitter", priority: "medium" },
      { name: "CNBC Halftime Podcast", url: "https://podcasts.apple.com/us/podcast/halftime-report/id1524487980", type: "rss_audio", priority: "high" }
    ]
  },
  joe_terranova: {
    name: "Joe Terranova",
    feeds: [
      { name: "Virtus ETF Commentary", url: "https://www.virtus.com/assets/files/etf-commentary-rss.xml", type: "rss_pdf", priority: "high" },
      { name: "X/Twitter", url: "https://twitter.com/terranovajoe", type: "twitter", priority: "medium" },
      { name: "CNBC Halftime Podcast", url: "https://podcasts.apple.com/us/podcast/halftime-report/id1524487980", type: "rss_audio", priority: "medium" }
    ]
  },
  dan_niles: {
    name: "Dan Niles",
    feeds: [
      { name: "Niles IM Blog", url: "https://www.nilesinvestmentmanagement.com", type: "html", priority: "high" },
      { name: "X/Twitter", url: "https://twitter.com/DanielTNiles", type: "twitter", priority: "medium" },
      { name: "CNBC TechCheck / Halftime", url: "https://www.cnbc.com/techcheck", type: "cnbc_html", priority: "medium" }
    ]
  },
  mohamed_el_erian: {
    name: "Mohamed El-Erian",
    feeds: [
      { name: "El-Erian Substack", url: "https://mohamedelerian.substack.com/feed", type: "rss", priority: "high" },
      { name: "Bloomberg Opinion", url: "https://www.bloomberg.com/opinion/columnists/100000057", type: "bloomberg_rss", priority: "high" },
      { name: "X/Twitter", url: "https://twitter.com/elerianm", type: "twitter", priority: "medium" },
      { name: "LinkedIn Posts", url: "https://www.linkedin.com/in/mohamedelerian", type: "linkedin_scrape", priority: "medium" }
    ]
  },
  guy_adami: {
    name: "Guy Adami",
    feeds: [
      { name: "On The Tape Podcast", url: "https://podcasts.apple.com/us/podcast/on-the-tape/id1545205930", type: "rss_audio", priority: "high" },
      { name: "CNBC Fast Money Podcast", url: "https://podcasts.apple.com/us/podcast/cnbcs-fast-money/id215529509", type: "rss_audio", priority: "high" },
      { name: "X/Twitter", url: "https://twitter.com/GuyAdami", type: "twitter", priority: "medium" },
      { name: "Private Advisor Group Blog", url: "https://privateadvisorgroup.com/insights", type: "html", priority: "low" }
    ]
  }
};

// Retrieval intervals based on priority
const RETRIEVAL_INTERVALS = {
  high: 5 * 60 * 1000, // 5 minutes in milliseconds
  medium: 30 * 60 * 1000, // 30 minutes in milliseconds
  low: 60 * 60 * 1000 // 60 minutes in milliseconds
};

// Retrieval intervals based on feed type
const TYPE_INTERVALS = {
  rss: 30 * 60 * 1000, // 30 minutes
  rss_audio: 30 * 60 * 1000, // 30 minutes
  youtube_api: 15 * 60 * 1000, // 15 minutes
  twitter: 2 * 60 * 1000, // 2 minutes
  linkedin_scrape: 30 * 60 * 1000, // 30 minutes
  cnbc_html: 15 * 60 * 1000, // 15 minutes
  bloomberg_rss: 30 * 60 * 1000, // 30 minutes
  rss_pdf: 60 * 60 * 1000, // 60 minutes
  html: 60 * 60 * 1000 // 60 minutes
};

// Get all feeds of a specific type
function getFeedsByType(type) {
  const feeds = [];
  
  Object.values(ANALYST_SOURCES).forEach(analyst => {
    analyst.feeds.forEach(feed => {
      if (feed.type === type) {
        feeds.push({
          ...feed,
          analystId: analyst.name,
          analystName: analyst.name
        });
      }
    });
  });
  
  return feeds;
}

// Get all feeds for a specific analyst
function getFeedsByAnalyst(analystId) {
  if (!ANALYST_SOURCES[analystId]) {
    return [];
  }
  
  return ANALYST_SOURCES[analystId].feeds.map(feed => ({
    ...feed,
    analystId,
    analystName: ANALYST_SOURCES[analystId].name
  }));
}

// Get all analysts
function getAllAnalysts() {
  return Object.entries(ANALYST_SOURCES).map(([id, data]) => ({
    id,
    name: data.name
  }));
}

// Get all feeds
function getAllFeeds() {
  const feeds = [];
  
  Object.entries(ANALYST_SOURCES).forEach(([analystId, analyst]) => {
    analyst.feeds.forEach(feed => {
      feeds.push({
        ...feed,
        analystId,
        analystName: analyst.name
      });
    });
  });
  
  return feeds;
}

module.exports = {
  ANALYST_SOURCES,
  RETRIEVAL_INTERVALS,
  TYPE_INTERVALS,
  getFeedsByType,
  getFeedsByAnalyst,
  getAllAnalysts,
  getAllFeeds
};
