# AI Trading Agent - Manual Deployment Guide

This guide provides step-by-step instructions for manually deploying your AI Trading Agent to Google Apps Script.

## Step 1: Create a New Google Apps Script Project

1. Go to [script.google.com](https://script.google.com/)
2. Click on "New Project"
3. Rename the project to "AI Trading Agent" by clicking on "Untitled project" in the top left corner

## Step 2: Create and Copy Files

For each file in your local project, you'll need to create a corresponding file in Google Apps Script and copy the contents:

### Code.gs
1. In the Google Apps Script editor, your project should already have a file named `Code.gs`
2. Copy the entire contents of your local `Code.gs` file and paste it into this file
3. Click "Save" (Ctrl+S or ⌘+S)

### Config.gs
1. Click the + button next to "Files" in the left sidebar
2. Name the file `Config.gs`
3. Copy the entire contents of your local `Config.gs` file and paste it into this file
4. Click "Save"

### Email.gs
1. Click the + button next to "Files" in the left sidebar
2. Name the file `Email.gs`
3. Copy the entire contents of your local `Email.gs` file and paste it into this file
4. Click "Save"

### Prompt.gs
1. Click the + button next to "Files" in the left sidebar
2. Name the file `Prompt.gs`
3. Copy the entire contents of your local `Prompt.gs` file and paste it into this file
4. Click "Save"

### Setup.gs
1. Click the + button next to "Files" in the left sidebar
2. Name the file `Setup.gs`
3. Copy the entire contents of your local `Setup.gs` file and paste it into this file
4. Click "Save"

## Step 3: Set Up API Key Security

For better security, store your OpenAI API key in Script Properties:

1. In the Google Apps Script editor, click on "Project Settings" (the gear icon)
2. Click on the "Script Properties" tab
3. Click "Add Script Property"
4. Set the property name as `OPENAI_API_KEY` and the value as your actual OpenAI API key
5. Click "Save Script Properties"

## Step 4: Run the Setup Script

The Setup.gs file contains a one-time setup script that will:
- Configure time-based triggers
- Validate your configuration
- Send a confirmation email

To run the setup:

1. Open the Google Apps Script editor
2. Select the `setupTradingAgent` function from the dropdown menu at the top
3. Click the "Run" button (play icon)
4. You'll be asked to authorize the script - follow the prompts to grant the necessary permissions
5. Check the "Execution log" to verify that the setup completed successfully
6. Check your email for a confirmation message

## Step 5: Verify the Triggers

To verify that the triggers were created correctly:

1. In the Google Apps Script editor, click on "Triggers" (the clock icon in the left sidebar)
2. You should see two time-based triggers for the `runTradingAnalysis` function:
   - One scheduled for 9:15 AM ET
   - One scheduled for 6:00 PM ET

## Step 6: Test the Deployment

Before relying on the automatic triggers, test your deployment manually:

1. In the Google Apps Script editor, select the `runTradingAnalysis` function from the dropdown menu
2. Click the "Run" button
3. Check the "Execution log" to verify that the script ran successfully
4. Check your email to verify that the trading analysis was sent correctly

## Keeping Local and Remote Code in Sync

Since you're manually deploying the code, it's important to keep track of changes:

1. Whenever you make changes to your local files, make sure to update the corresponding files in Google Apps Script
2. Consider adding version numbers or dates in comments to track which version is deployed
3. You might want to keep a changelog to track important updates

## Troubleshooting

### API Key Issues

If you encounter errors related to the OpenAI API key:
1. Verify that the API key is correctly set in Script Properties
2. Check that the API key has sufficient quota and permissions for the GPT-4.5-preview model

### Execution Timeouts

Google Apps Script has a maximum execution time of 6 minutes. If your script times out:
1. Consider optimizing your code to reduce execution time
2. Check if the OpenAI API is responding slowly

### Email Delivery Issues

If emails are not being delivered:
1. Verify that the recipient email addresses are correct in Config.gs
2. Check your spam folder
3. Ensure that you haven't exceeded Gmail's sending limits
