#!/bin/bash
# Deploy Market Sentiment Analyzer to Google Cloud Functions
# Usage: ./deploy.sh <GCP_PROJECT_ID> <REGION> <FUNCTION_NAME>

set -e

if [ $# -lt 3 ]; then
  echo "Usage: $0 <GCP_PROJECT_ID> <REGION> <FUNCTION_NAME>"
  exit 1
fi

PROJECT_ID=$1
REGION=$2
FUNCTION_NAME=$3

# Load .env and export as environment variables for GCF
env_vars=$(grep -v '^#' .env | grep -v '^$' | sed 's/\r$//' | awk -F= '{print $1}' | paste -sd, -)

# Deploy
echo "Cleaning up previous build artifacts..."
rm -rf ./market-sentiment-analyzer
rm -rf ./node_modules
rm -f ./package-lock.json

# Ensure market-sentiment-analyzer source is copied cleanly
ANALYZER_SOURCE_DIR="../market-sentiment-analyzer"
ANALYZER_DEST_DIR="./market-sentiment-analyzer"

if [ -d "$ANALYZER_SOURCE_DIR" ]; then
  echo "Copying market-sentiment-analyzer source to $ANALYZER_DEST_DIR..."
  mkdir -p "$ANALYZER_DEST_DIR"
  rsync -av --progress "$ANALYZER_SOURCE_DIR/" "$ANALYZER_DEST_DIR/" \
    --exclude 'node_modules' \
    --exclude 'package.json' \
    --exclude 'package-lock.json' \
    --exclude '.git' \
    --exclude 'output/' \
    --exclude '.DS_Store' \
    --exclude 'ml-venv/' \
    --exclude '__pycache__/' \
    --exclude '*.pyc' \
    --exclude '*.py' \
    --exclude 'src/python/' \
    --exclude 'ml/' \
    --exclude 'logs/' \
    --exclude 'focused-tests/' \
    --exclude 'expanded-tests/' \
    --exclude 'debug/' \
    --exclude 'comprehensive-tests/' \
    --exclude 'data/' \
    --exclude 'models/' \
    --exclude 'test-outputs/' \
    --exclude 'time-series-tests/' \
    --exclude 'venv/'
else
  echo "Error: $ANALYZER_SOURCE_DIR directory not found."
  exit 1
fi

echo "Installing dependencies for GCF deployment..."
npm install

if [ ! -f "./package-lock.json" ]; then
  echo "Warning: package-lock.json was not created. This might lead to inconsistent builds."
fi

gcloud functions deploy $FUNCTION_NAME \
  --project=$PROJECT_ID \
  --region=$REGION \
  --runtime=nodejs20 \
  --trigger-http \
  --entry-point=marketSentimentAPI \
  --allow-unauthenticated \
  --ignore-file=.gcloudignore \
  --source=. \
  --env-vars-file=env.yaml \
  --memory=512MB \
  --timeout=540s

echo "Deployed $FUNCTION_NAME to project $PROJECT_ID in region $REGION."
