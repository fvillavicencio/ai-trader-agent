#!/bin/bash
# Google Cloud SDK Setup Script for Geopolitical Risk Analysis Project
# This script helps install and configure Google Cloud SDK

echo "🚀 Google Cloud SDK Setup for Geopolitical Risk Analysis"
echo "========================================================"

# Check if Google Cloud SDK is already installed
if command -v gcloud &> /dev/null; then
  echo "✅ Google Cloud SDK is already installed"
  gcloud --version | head -n 1
else
  echo "❌ Google Cloud SDK is not installed"
  echo ""
  echo "Installing Google Cloud SDK for macOS..."
  
  # Check if Homebrew is installed
  if command -v brew &> /dev/null; then
    echo "Using Homebrew to install Google Cloud SDK..."
    brew install --cask google-cloud-sdk
  else
    echo "Homebrew not found. Using direct download method..."
    echo "Please follow these steps to install Google Cloud SDK:"
    echo ""
    echo "1. Visit: https://cloud.google.com/sdk/docs/install-sdk"
    echo "2. Download the macOS installer"
    echo "3. Run the installer and follow the prompts"
    echo "4. After installation, return to this script"
    echo ""
    echo "Press Enter when you've completed the installation..."
    read -p ""
  fi
fi

# Check if installation was successful
if ! command -v gcloud &> /dev/null; then
  echo "❌ Google Cloud SDK installation could not be verified"
  echo "Please install Google Cloud SDK manually and run this script again"
  exit 1
fi

echo ""
echo "🔐 Setting up Google Cloud authentication"
echo "========================================"
echo "You'll need to authenticate with Google Cloud to deploy the functions."
echo "This will open a browser window for you to sign in with your Google account."
echo ""
echo "Press Enter to continue with authentication..."
read -p ""

# Run gcloud auth login
gcloud auth login

# Check authentication status
echo ""
echo "Checking authentication status..."
AUTH_STATUS=$(gcloud auth list --filter=status:ACTIVE --format="value(account)")

if [ -n "$AUTH_STATUS" ]; then
  echo "✅ Successfully authenticated as: $AUTH_STATUS"
else
  echo "❌ Authentication failed or was cancelled"
  exit 1
fi

# Set up project
echo ""
echo "🏗️ Setting up Google Cloud project"
echo "=================================="
echo "You need to select or create a Google Cloud project for deployment."
echo ""
echo "Available projects:"
gcloud projects list

echo ""
echo "Enter your Google Cloud project ID (or enter a new name to create one):"
read PROJECT_ID

# Check if project exists
PROJECT_EXISTS=$(gcloud projects list --filter="PROJECT_ID:$PROJECT_ID" --format="value(PROJECT_ID)")

if [ -z "$PROJECT_EXISTS" ]; then
  echo "Creating new project: $PROJECT_ID..."
  gcloud projects create $PROJECT_ID
fi

# Set as default project
gcloud config set project $PROJECT_ID
echo "✅ Project set to: $PROJECT_ID"

# Enable required APIs
echo ""
echo "🔌 Enabling required Google Cloud APIs"
echo "====================================="
echo "Enabling Cloud Functions API..."
gcloud services enable cloudfunctions.googleapis.com
echo "Enabling Cloud Build API..."
gcloud services enable cloudbuild.googleapis.com
echo "Enabling Cloud Storage API..."
gcloud services enable storage-api.googleapis.com
echo "Enabling Cloud Scheduler API..."
gcloud services enable cloudscheduler.googleapis.com

# Set up environment variables
echo ""
echo "🔑 Setting up API keys"
echo "====================="
echo "You'll need API keys for Perplexity and OpenAI."
echo ""
echo "Enter your Perplexity API key (or press Enter to skip):"
read PERPLEXITY_API_KEY

echo "Enter your OpenAI API key (or press Enter to skip):"
read OPENAI_API_KEY

# Create .env file
echo "PERPLEXITY_API_KEY=$PERPLEXITY_API_KEY" > .env
echo "OPENAI_API_KEY=$OPENAI_API_KEY" >> .env
echo "BUCKET_NAME=geopolitical-risk-data-$PROJECT_ID" >> .env
echo "PERPLEXITY_MODEL=sonar-pro" >> .env
echo "GOOGLE_CLOUD_PROJECT=$PROJECT_ID" >> .env
echo "REGION=us-central1" >> .env

echo "✅ Environment file created: .env"

echo ""
echo "🎉 Setup complete! You're now ready to deploy the Geopolitical Risk Analysis system."
echo "Run the following command to deploy:"
echo "npm run quick-deploy"
