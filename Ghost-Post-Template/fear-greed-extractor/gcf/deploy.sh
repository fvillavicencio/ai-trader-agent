#!/bin/bash
set -e

# Set your Google Cloud project ID
PROJECT_ID="peppy-cosmos-461901-k8"
REGION="us-east1"
FUNCTION_NAME="collectFearAndGreedData"
SERVICE_ACCOUNT="849508757740-compute@developer.gserviceaccount.com"

# Deploy the Cloud Function
echo "Deploying Cloud Function..."
gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=nodejs22 \
  --region=$REGION \
  --source=. \
  --entry-point=collectFearAndGreedData \
  --trigger-http \
  --no-allow-unauthenticated \
  --timeout=120s \
  --memory=256MB \
  --env-vars-file=env.yaml \
  --service-account=$SERVICE_ACCOUNT

# Get the function URL
FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --format="value(serviceConfig.uri)")
echo "Function URL: $FUNCTION_URL"

# Create or update the first scheduler job (12:15 AM)
echo "Setting up scheduler for 12:15 AM..."
gcloud scheduler jobs create http "${FUNCTION_NAME}-1215" \
  --schedule="15 0 * * *" \
  --uri="$FUNCTION_URL" \
  --http-method=GET \
  --attempt-deadline=120s \
  --time-zone="America/New_York" \
  --location=$REGION \
  --description="Trigger Fear and Greed Index collection at 12:15 AM ET" \
  --oidc-service-account-email=$SERVICE_ACCOUNT \
  --oidc-token-audience="$FUNCTION_URL" \
  || gcloud scheduler jobs update http "${FUNCTION_NAME}-1215" \
     --schedule="15 0 * * *" \
     --uri="$FUNCTION_URL" \
     --http-method=GET \
     --attempt-deadline=120s \
     --time-zone="America/New_York" \
     --location=$REGION \
     --description="Trigger Fear and Greed Index collection at 12:15 AM ET" \
     --oidc-service-account-email=$SERVICE_ACCOUNT \
     --oidc-token-audience="$FUNCTION_URL"

# Create or update the second scheduler job (12:30 AM)
echo "Setting up scheduler for 12:30 AM..."
gcloud scheduler jobs create http "${FUNCTION_NAME}-1230" \
  --schedule="30 0 * * *" \
  --uri="$FUNCTION_URL" \
  --http-method=GET \
  --attempt-deadline=120s \
  --time-zone="America/New_York" \
  --location=$REGION \
  --description="Trigger Fear and Greed Index collection at 12:30 AM ET" \
  --oidc-service-account-email=$SERVICE_ACCOUNT \
  --oidc-token-audience="$FUNCTION_URL" \
  || gcloud scheduler jobs update http "${FUNCTION_NAME}-1230" \
     --schedule="30 0 * * *" \
     --uri="$FUNCTION_URL" \
     --http-method=GET \
     --attempt-deadline=120s \
     --time-zone="America/New_York" \
     --location=$REGION \
     --description="Trigger Fear and Greed Index collection at 12:30 AM ET" \
     --oidc-service-account-email=$SERVICE_ACCOUNT \
     --oidc-token-audience="$FUNCTION_URL"

echo "Deployment complete!"
