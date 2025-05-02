# How to Update Your Config.gs File in Google Apps Script

Since the clasp tool is having issues, here's how to manually update your Config.gs file in Google Apps Script:

## Step 1: Open Your Google Apps Script Project

1. Go to [script.google.com](https://script.google.com/)
2. Find and open your "AI Trading Agent" project

## Step 2: Update Config.gs

1. In the Google Apps Script editor, find and click on the `Config.gs` file in the left sidebar
2. Replace the RECIPIENT_EMAILS line with:
   ```javascript
   const RECIPIENT_EMAILS = ["fvillavicencio@gmail.com", "zitro123@yahoo.com"]; // Array of recipient email addresses
   ```

3. Click "Save" (Ctrl+S or ⌘+S)

## Step 3: Test Your Changes

1. In the Google Apps Script editor, select the `runTradingAnalysis` function from the dropdown menu
2. Click the "Run" button (play icon)
3. Check that emails are sent to both of your updated email addresses

## Enabling the Google Apps Script API (For Future Use with clasp)

To use clasp for automatic syncing in the future:

1. Visit [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings)
2. Turn on the "Google Apps Script API" toggle
3. Wait a few minutes for the change to take effect
4. Run this command to push your local changes:
   ```
   /Users/frankvillavicencio/.nvm/versions/node/v18.20.4/bin/clasp push
   ```

This will allow you to use clasp to automatically sync your local files with Google Apps Script in the future.
