/**
 * Catchy Titles Database
 * 
 * A collection of witty, financial-themed one-liners for Market Pulse Daily reports,
 * organized by market sentiment categories.
 */

// Buy/Bullish titles - for positive market sentiment
const bullishTitles = [
  // Wall Street (1987) inspired
  "Greed Is Good",
  "Blue Horseshoe Loves This Market",
  "Money Never Sleeps",
  "Lunch Is For Wimps",
  
  // The Wolf of Wall Street inspired
  "Absolutely Vertical",
  "Rookie Numbers",
  "Buy The Dip",
  "The Show Goes On",
  "Tuxedo Time",
  
  // The Big Short inspired
  "I'm Jacked! Jacked To The Tits!",
  "Opportunity Of A Lifetime",
  "It's Time To Get Rich",
  "The Upside Looks Tasty",
  
  // Margin Call inspired
  "Be First, Be Smarter",
  "There's Money To Be Made",
  "The Music Is Still Playing",
  
  // Trading Places inspired
  "Looking Good, Billy Ray!",
  "Feeling Good, Louis!",
  "Buy Low, Sell High",
  
  // Boiler Room inspired
  "Act As If",
  "Everybody Wants The Dream",
  
  // Financial idioms and phrases
  "Bulls On Parade",
  "Green Across The Board",
  "Full Steam Ahead",
  "Riding The Bull",
  "To The Moon",
  "Cash Is Flowing",
  "Diamond Hands",
  "FOMO Activated",
  "Printer Goes Brrr",
  "Tendies For Dinner",
  "Champagne Problems",
  "The Trend Is Your Friend",
  "Catching The Wave",
  "The Bulls Are Running",
  "Rocket Emoji Time"
];

// Sell/Bearish titles - for negative market sentiment
const bearishTitles = [
  // Wall Street inspired
  "Downward Is Visible",
  "The Correction Is Coming",
  "The Party's Over",
  
  // The Big Short inspired
  "It's Time To Get Short",
  "The Bubble Has Popped",
  "The House Of Cards",
  "Dogshit Wrapped In Catshit",
  
  // Margin Call inspired
  "Sell It All Today",
  "The Music Stopped",
  "There Are Three Ways To Make Money",
  "Be First, Be Smarter, Or Cheat",
  
  // Too Big To Fail inspired
  "The Dominoes Are Falling",
  "The Worst Is Yet To Come",
  "Batten Down The Hatches",
  
  // Financial idioms and phrases
  "Bears In Control",
  "Red Wedding",
  "Blood In The Streets",
  "Catching Falling Knives",
  "The Sky Is Falling",
  "Dead Cat Bounce",
  "Abandon Ship",
  "Sell The Rip",
  "Paper Hands Time",
  "Winter Is Coming",
  "The Bears Are Hungry",
  "The Bubble Has Burst",
  "The Tide Is Going Out",
  "The Party's Over",
  "Exit Stage Left"
];

// Hold/Neutral titles - for mixed or uncertain market sentiment
const neutralTitles = [
  // Wall Street inspired
  "Patience, Grasshopper",
  "The Details Are Fuzzy",
  
  // The Big Short inspired
  "Just Wait",
  "Truth Is Like Poetry",
  "Nobody Knows",
  
  // Margin Call inspired
  "It's All Just The Same Thing",
  "Funny Money",
  "The Gray Area",
  
  // Financial idioms and phrases
  "Proceed With Caution",
  "The Jury Is Still Out",
  "Stuck In The Middle",
  "The Waiting Game",
  "Neither Bull Nor Bear",
  "Watching From The Sidelines",
  "The Fog Of Markets",
  "Steady As She Goes",
  "The Calm Before The Storm",
  "Mixed Signals",
  "Tug Of War",
  "The Plot Thickens",
  "Walking The Tightrope",
  "The Crossroads",
  "Holding Pattern",
  "The Jury Is Out",
  "Time Will Tell",
  "Wait And See"
];

// Volatility titles - for highly volatile or uncertain markets
const volatilityTitles = [
  // Wall Street and other movie inspired
  "Turbulence Ahead",
  "Fasten Your Seatbelts",
  "Wild Ride",
  
  // The Big Short inspired
  "It's Time To Get Weird",
  "The Casino Is Open",
  
  // Financial idioms and phrases
  "Rollercoaster Day",
  "Market Whiplash",
  "Chaos Reigns",
  "The Perfect Storm",
  "Lightning In A Bottle",
  "The Pendulum Swings",
  "Buckle Up",
  "Brace For Impact",
  "The Vix Fix",
  "Fear And Greed",
  "Expect The Unexpected",
  "The Only Constant Is Change",
  "The New Normal",
  "The Wild West",
  "The Twilight Zone"
];

/**
 * Get a random catchy title based on market sentiment
 * @param {string} sentiment - Market sentiment: 'bullish', 'bearish', 'neutral', or 'volatile'
 * @returns {string} - A random catchy title
 */
const getRandomCatchyTitle = (sentiment) => {
  let titles;
  
  // Select the appropriate title list based on sentiment
  switch (sentiment.toLowerCase()) {
    case 'bullish':
    case 'buy':
    case 'positive':
      titles = bullishTitles;
      break;
    case 'bearish':
    case 'sell':
    case 'negative':
      titles = bearishTitles;
      break;
    case 'neutral':
    case 'hold':
    case 'mixed':
      titles = neutralTitles;
      break;
    case 'volatile':
    case 'volatility':
    case 'uncertain':
      titles = volatilityTitles;
      break;
    default:
      // Combine all titles if sentiment is not recognized
      titles = [...bullishTitles, ...bearishTitles, ...neutralTitles, ...volatilityTitles];
  }
  
  // Return a random title from the selected list
  return titles[Math.floor(Math.random() * titles.length)];
};

module.exports = {
  getRandomCatchyTitle,
  bullishTitles,
  bearishTitles,
  neutralTitles,
  volatilityTitles
};
