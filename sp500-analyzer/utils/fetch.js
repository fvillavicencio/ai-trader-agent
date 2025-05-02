import axios from 'axios';

export async function fetchUrl(url, opts = {}) {
  try {
    const response = await axios.get(url, opts);
    return response.data;
  } catch (err) {
    throw new Error(`Failed to fetch ${url}: ${err.message}`);
  }
}
