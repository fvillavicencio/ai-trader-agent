# AI Trading Agent

This project implements an AI-driven trading decision agent that analyzes various financial sources and data inputs twice daily (9:15 am ET and 6:00 pm ET), Sunday evening through Friday morning. The agent delivers trading decisions labeled clearly and sends notifications via email.

## Implementation

The agent is implemented using:
- Google Apps Script (GAS) for scheduling and email automation
- OpenAI API (ChatGPT) for sophisticated analysis
- JSON for structured input/output between GAS and ChatGPT

## Features

- Scheduled analysis at 9:15 am ET and 6:00 pm ET, Sunday evening through Friday morning
- Analysis of various financial sources and data inputs
- Clear trading decision labels: Buy Now, Sell Now, Watch for Better Price Action
- Email notifications with decision and justification

## Setup

1. Create a new Google Apps Script project
2. Copy the code files from this repository into your project
3. Set up your OpenAI API key in the script properties
4. Set up the email recipient(s) in the script
5. Set up triggers to run the script at the specified times

## Files

- `Code.gs`: Main script file containing the core functionality
- `Prompt.gs`: Contains the prompt template for the OpenAI API
- `Config.gs`: Configuration settings for the script
- `Email.gs`: Email formatting and sending functions

## Usage

Once set up, the script will run automatically at the specified times and send email notifications with trading decisions.
