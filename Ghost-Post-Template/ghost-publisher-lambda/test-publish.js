const fs = require('fs');
const GhostAdminAPI = require('@tryghost/admin-api');

// Load the data
const data = JSON.parse(fs.readFileSync('../market_pulse_data.json', 'utf8'));

// Initialize the Ghost Admin API client
const api = new GhostAdminAPI({
    url: 'https://market-pulse-daily.ghost.io',
    key: '67f457a5f41c9900013e1e47:44daf1e666349bde96fad6f9a65979ba1d0b11b161a5c765847218f5bd263b7c',
    version: 'v4'
});

// Test publishing
async function testPublish() {
    try {
        // Generate title
        const title = generateEngagingTitle();
        console.log('Generating title:', title);

        // Convert data to string
        const dataString = JSON.stringify(data);
        console.log('Converted data to string');

        // Format the data as a proper mobiledoc
        const formattedMobiledoc = {
            version: '0.3.1',
            markups: [],
            atoms: [],
            cards: [
                [
                    "card",
                    {
                        "cardType": "html",
                        "content": "<div class='market-pulse-container'>" + dataString + "</div>"
                    }
                ]
            ],
            sections: [
                [10, 0]
            ]
        };

        console.log('Formatted mobiledoc:', JSON.stringify(formattedMobiledoc, null, 2));

        // Create post
        const post = await api.posts.add({
            title,
            mobiledoc: JSON.stringify(formattedMobiledoc),
            status: 'published',
            tags: [{ name: 'Market Insights' }, { name: 'Daily Update' }, { name: 'Market Pulse' }],
            visibility: 'public',
            excerpt: 'Market analysis and trading insights',
            feature_image: null,
            email_recipients: 'all',
            email_subject: title,
            email_body: title,
            email_newsletter: '67f427c5744a72000854ee8f'
        });

        console.log('Post created successfully!');
        console.log('Post URL:', `${api.config.url}/${post.slug}`);
        console.log('Post ID:', post.id);
        console.log('Post data:', JSON.stringify(post, null, 2));

    } catch (error) {
        console.error('Error:', error);
        console.error('Error details:', error.details);
        console.error('Error stack:', error.stack);
    }
}

testPublish();

// Helper function
function generateEngagingTitle() {
    const now = new Date();
    
    // Format time and date
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    
    const time = formatter.format(now);
    const date = dateFormatter.format(now);
    
    // List of market phrases to choose from
    const marketPhrases = [
        "Market Currents", "Market Pulse", "Market Whisper", "Market Musings", "Market Rhythms",
        "Market Beats", "Market Insights", "Market Signals", "Market Watch", "Market Movements"
    ];
    
    // List of emojis to choose from
    const emojis = ["📊", "📈", "📉", "💰", "🔍", "🎯", "💡", "⚡", "💫", "🌟"];
    
    // Randomly select a phrase and emoji
    const phrase = marketPhrases[Math.floor(Math.random() * marketPhrases.length)];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    
    return `${phrase} ${emoji} - ${date} ${time} ET`;
}
