# AI Trading Agent - Deployment Guide

This guide will walk you through the process of deploying your AI Trading Agent to Google Apps Script for automated execution.

## Prerequisites

- A Google account
- An OpenAI API key

## Step 1: Create a New Google Apps Script Project

1. Go to [script.google.com](https://script.google.com/)
2. Click on "New Project"
3. Rename the project to "AI Trading Agent" by clicking on "Untitled project" in the top left corner

## Step 2: Upload Your Code Files

You need to create the following files in your Google Apps Script project:

1. **Code.gs**: Main script with core functionality
2. **Config.gs**: Configuration settings
3. **Email.gs**: Email formatting and sending functions
4. **Prompt.gs**: Prompt template for OpenAI API
5. **Setup.gs**: One-time setup script

For each file:
1. Click the + button next to "Files" in the left sidebar
2. Name the file exactly as listed above
3. Copy and paste the contents from your local files into the corresponding Google Apps Script file

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

## Monitoring and Maintenance

### Execution Logs

1. In the Google Apps Script editor, click on "Executions" in the left sidebar
2. Review the execution history to check for any errors or issues

### Updating the Script

To update the script:
1. Make your changes to the code files
2. Save the changes
3. The changes will be automatically applied to the next execution

## Security Considerations

- **API Key**: Never share your OpenAI API key or commit it to public repositories
- **Email Content**: Be aware that email content may contain sensitive financial information
- **Access Control**: Limit access to the Google Apps Script project to authorized personnel only

## Additional Resources

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Gmail Quotas and Limits](https://developers.google.com/apps-script/guides/services/quotas)

## Support

If you encounter any issues with your AI Trading Agent, please review the execution logs and error messages for troubleshooting guidance.
