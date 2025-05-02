# Market Pulse Daily - Ghost Post Template

This repository contains tools to generate and publish Market Pulse Daily reports to Ghost.io using Koenig blocks for a more interactive and engaging experience.

## Features

- Converts JSON data into Ghost Koenig blocks
- Publishes content to Ghost.io using the Admin API
- Responsive design that works on desktop and mobile
- Interactive elements for better reader engagement
- Consistent styling with your Ghost site's design

## Files

- `generate-ghost-post.js` - Converts JSON data into Ghost Koenig blocks
- `publish-to-ghost.js` - Publishes the generated content to Ghost.io
- `solo/post.hbs` - Custom Ghost post template for Market Pulse Daily
- `full-dataset.json` - Sample JSON data for generating a post

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the `src` directory with your Ghost API credentials:
   ```
   GHOST_URL="https://your-ghost-blog.ghost.io"
   GHOST_API_KEY="your-admin-api-key"
   ```

## Usage

1. Generate the Ghost post JSON:
   ```bash
   node generate-ghost-post.js
   ```

2. Publish the post to Ghost:
   ```bash
   node publish-to-ghost.js
   ```

## Notes

- All data comes from the JSON file, with no hardcoded values in the JavaScript code
- The template is designed to be responsive and work well on both desktop and mobile
- The Ghost post is published using Koenig blocks for better editing and interactivity

## License

MIT
