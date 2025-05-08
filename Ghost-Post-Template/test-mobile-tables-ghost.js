/**
 * Test Mobile Tables in Ghost
 * 
 * This script generates a test post in Ghost to verify that our mobile-friendly
 * table improvements are working correctly.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, 'src', '.env') });

// Ghost API configuration
const GHOST_URL = process.env.GHOST_URL;
const GHOST_API_KEY = process.env.GHOST_API_KEY;

// Sample data for testing
const sampleData = {
  peRatio: {
    current: "25.08",
    fiveYearAvg: "22.54",
    tenYearAvg: "20.87"
  },
  eps: {
    ttm: "$22.47",
    targetAt15x: "$337.05",
    targetAt17x: "$382.00",
    targetAt20x: "$449.40"
  },
  forwardEps: [
    {
      year: "2025",
      eps: "$261.04",
      targetAt15x: "$3,915.60",
      targetAt17x: "$4,437.68",
      targetAt20x: "$5,220.80",
      percentVsIndex15x: "30.70",
      percentVsIndex17x: "21.80",
      percentVsIndex20x: "7.60"
    },
    {
      year: "2026",
      eps: "$298.48",
      targetAt15x: "$4,477.20",
      targetAt17x: "$5,074.16",
      targetAt20x: "$5,969.60",
      percentVsIndex15x: "25.86",
      percentVsIndex17x: "10.20",
      percentVsIndex20x: "5.60"
    }
  ]
};

// Helper function to format numbers
const formatNumber = (num) => {
  if (!num) return '0.00';
  return parseFloat(num.toString().replace(/,/g, '')).toFixed(2);
};

// Helper function to format currency with commas
const formatCurrencyWithCommas = (value) => {
  if (!value) return '$0.00';
  const numericValue = value.toString().replace(/[^0-9.]/g, '');
  return '$' + parseFloat(numericValue).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Generate HTML content for the test post
const generateTestPostHTML = () => {
  const currentDate = new Date().toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return `
    <div style="max-width: 800px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;">
      <h1>Mobile-Friendly Tables Test</h1>
      <p>This post demonstrates the mobile-friendly table improvements in the Market Pulse Daily report. The tables below should be horizontally scrollable on mobile devices.</p>
      
      <h2>S&P 500 Trailing P/E Ratio</h2>
      <div style="background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; margin-bottom: 20px;">
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%;">
          <table style="width: 100%; min-width: 300px; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="background-color: #0c6e3d; text-align: center; font-weight: 600; color: white;">
                <th style="padding: 12px 8px; white-space: nowrap;">Current</th>
                <th style="padding: 12px 8px; white-space: nowrap;">5-Year Avg</th>
                <th style="padding: 12px 8px; white-space: nowrap;">10-Year Avg</th>
              </tr>
            </thead>
            <tbody>
              <tr style="text-align: center; background: white;">
                <td style="padding: 15px 8px; font-weight: bold; font-size: 1.25rem;">${sampleData.peRatio.current}</td>
                <td style="padding: 15px 8px; font-size: 1.25rem;">${sampleData.peRatio.fiveYearAvg}</td>
                <td style="padding: 15px 8px; font-size: 1.25rem;">${sampleData.peRatio.tenYearAvg}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="font-size: 10px; color: #888; width: 100%; text-align: right; margin-top: 5px;">
          Source: <a href="https://finance.yahoo.com/quote/%5EGSPC/" target="_blank" style="color:#2563eb; text-decoration:underline;">Yahoo Finance</a>, as of May 6, 2025
        </div>
      </div>
      
      <h2>S&P 500 Earnings Per Share (Trailing 12M)</h2>
      <div style="background-color: #f9f9f9; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 15px; margin-bottom: 20px;">
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%;">
          <table style="width: 100%; min-width: 400px; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="background-color: #0c6e3d; text-align: center; font-weight: 600; color: white;">
                <th style="padding: 12px 8px; white-space: nowrap;">S&P 500 EPS (TTM)</th>
                <th style="padding: 12px 8px; white-space: nowrap;">Target at 15x</th>
                <th style="padding: 12px 8px; white-space: nowrap;">Target at 17x</th>
                <th style="padding: 12px 8px; white-space: nowrap;">Target at 20x</th>
              </tr>
            </thead>
            <tbody>
              <tr style="text-align: center; background: white;">
                <td style="padding: 15px 8px; font-weight: bold; font-size: 1.25rem;">${sampleData.eps.ttm}</td>
                <td style="padding: 15px 8px; font-size: 1.25rem;">${sampleData.eps.targetAt15x}</td>
                <td style="padding: 15px 8px; font-size: 1.25rem;">${sampleData.eps.targetAt17x}</td>
                <td style="padding: 15px 8px; font-size: 1.25rem;">${sampleData.eps.targetAt20x}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="font-size: 10px; color: #888; width: 100%; text-align: right; margin-top: 5px;">
          Source: <a href="https://finance.yahoo.com/quote/%5EGSPC/" target="_blank" style="color:#2563eb; text-decoration:underline;">Yahoo Finance</a>, as of May 6, 2025
        </div>
      </div>
      
      <h2>S&P 500 Forward EPS & Implied Index Values</h2>
      <div style="margin: 20px 0; padding: 28px 32px; background-color: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="font-weight: bold; font-size: clamp(1.1rem,2vw,1.25rem); margin-bottom: 15px; color: #1a365d; text-align: center;">S&P 500 Forward EPS & Implied Index Values</div>
        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; max-width: 100%;">
          <table style="width: 100%; min-width: 400px; border-collapse: collapse; margin-bottom: 10px;">
            <thead>
              <tr style="background-color: #0c6e3d; text-align: center; font-weight: 600; color: white;">
                <th style="padding: 12px 8px; white-space: nowrap;">Annual Estimate</th>
                <th style="padding: 12px 8px; white-space: nowrap;">Forward EPS</th>
                <th style="padding: 12px 8px; white-space: nowrap;">15x</th>
                <th style="padding: 12px 8px; white-space: nowrap;">17x</th>
                <th style="padding: 12px 8px; white-space: nowrap;">20x</th>
              </tr>
            </thead>
            <tbody>
              ${sampleData.forwardEps.map(item => `
                <tr style="text-align: center; background: white;">
                  <td style="padding: 15px 8px; font-weight: bold; font-size: 0.95rem;">${item.year}</td>
                  <td style="padding: 15px 8px; font-weight: bold; font-size: 0.95rem;">${item.eps}</td>
                  <td style="padding: 15px 8px; font-size: 0.95rem;">${item.targetAt15x} <span style="font-size: 0.75rem; color: #10b981;">(▲ ${item.percentVsIndex15x}%)</span></td>
                  <td style="padding: 15px 8px; font-size: 0.95rem;">${item.targetAt17x} <span style="font-size: 0.75rem; color: #10b981;">(▲ ${item.percentVsIndex17x}%)</span></td>
                  <td style="padding: 15px 8px; font-size: 0.95rem;">${item.targetAt20x} <span style="font-size: 0.75rem; color: #10b981;">(▲ ${item.percentVsIndex20x}%)</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="font-size: 10px; color: #888; margin-top: 8px; text-align: right;">
          Source: <a href="#" target="_blank" style="color:#2563eb; text-decoration:underline;">S&P Global</a>, as of May 6, 2025
        </div>
      </div>
      
      <p>To test these tables on mobile, please view this post on your mobile device. The tables should be horizontally scrollable, allowing you to see all columns even on smaller screens.</p>
      
      <p>Test generated on: ${currentDate}</p>
    </div>
  `;
};

// Create a Ghost post using the Ghost Content API
const createGhostPost = async () => {
  try {
    const postTitle = `Mobile-Friendly Tables Test - ${new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`;
    
    const postData = {
      title: postTitle,
      html: generateTestPostHTML(),
      status: 'published',
      tags: ['test'],
      featured: false,
      visibility: 'public'
    };
    
    const url = `${GHOST_URL}/ghost/api/admin/posts/?source=html`;
    
    const response = await axios.post(url, {
      posts: [postData]
    }, {
      headers: {
        'Authorization': `Ghost ${GHOST_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Test post created successfully!');
    console.log(`Post URL: ${response.data.posts[0].url}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating Ghost post:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

// Run the script
createGhostPost()
  .then(() => console.log('Test completed successfully'))
  .catch(err => console.error('Test failed:', err.message));
