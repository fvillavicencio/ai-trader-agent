# AI Trading Agent Setup Guide

This guide will help you set up and test the AI Trading Agent locally before deploying it to Google Apps Script.

## Local Testing Setup

1. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

2. **Configure your OpenAI API key**:
   - Copy the `.env.example` file to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Edit the `.env` file and add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

3. **Run the local test script**:
   ```bash
   node local_test.js
   ```
   This will:
   - Connect to the OpenAI API
   - Send the trading analysis prompt
   - Display the raw response
   - Parse the decision and justification
   - Format it as an email
   - Show the formatted email in the console

## Google Apps Script Deployment

1. **Create a new Google Apps Script project**:
   - Go to [script.google.com](https://script.google.com/)
   - Click "New project"

2. **Copy the code files**:
   - Copy the contents of each `.gs` file into your Google Apps Script project:
     - `Code.gs`
     - `Config.gs`
     - `Email.gs`
     - `Prompt.gs`

3. **Configure your API key and email recipient**:
   - In the Google Apps Script editor, go to "Project Settings" > "Script Properties"
   - Add a new property with the name `OPENAI_API_KEY` and your API key as the value
   - Add a new property with the name `EMAIL_RECIPIENT` and your email address as the value

4. **Test the script**:
   - In the Google Apps Script editor, select the `testTradingAnalysis` function from the dropdown menu
   - Click the "Run" button
   - Check your Gmail drafts for the test email

5. **Set up triggers**:
   - Run the `setupTriggers` function to create the scheduled triggers
   - Alternatively, you can set up triggers manually:
     - In the Google Apps Script editor, click on "Triggers" in the left sidebar
     - Click "+ Add Trigger"
     - Set "Choose which function to run" to `runTradingAnalysis`
     - Set "Select event source" to "Time-driven"
     - Configure the time-based triggers for 9:15 AM ET and 6:00 PM ET

## Notes

- The script is configured to run twice daily (9:15 AM ET and 6:00 PM ET) from Sunday evening through Friday morning.
- The script will skip weekends (Saturday and Sunday morning).
- The script will send an email with the trading decision and justification to the configured recipient.
- The email will include the next scheduled analysis time.

## Troubleshooting

- If you encounter an error with the OpenAI API, check your API key and make sure it has sufficient quota.
- If the script is not running at the scheduled times, check the triggers in the Google Apps Script editor.
- If the email is not being sent, check the email recipient configuration and make sure you have permission to send emails from your Google account.
