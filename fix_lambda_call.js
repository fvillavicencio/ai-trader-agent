// This file contains the changes needed for the publishToGhostWithLambda function
// to always call the Lambda API regardless of draftOnly setting

// Change 1: Update the payload to include the draftOnly parameter
const payload = {
  ghostUrl: ghostUrl,
  ghostApiKey: ghostApiKey,
  newsletterId: newsletterId,
  jsonData: jsonData,
  draftOnly: !!options.draftOnly  // Pass the draftOnly parameter to the Lambda function
};

// Change 2: Always call the Lambda API, regardless of draftOnly setting
Logger.log('Calling Lambda API to ' + (options.draftOnly ? 'create draft' : 'publish') + ' article...');
const response = UrlFetchApp.fetch(lambdaApiUrl, {
  method: 'post',
  contentType: 'application/json',
  headers: {
    'x-api-key': lambdaApiKey
  },
  payload: JSON.stringify(payload),
  muteHttpExceptions: true
});
