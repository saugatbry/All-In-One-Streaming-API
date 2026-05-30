import axios from 'axios';
import cloudscraper from 'cloudscraper';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

async function fetchWithFallback(url, options = {}) {
  try {
    const { data } = await axios.get(url, {
      headers: { ...DEFAULT_HEADERS, ...options.headers },
      timeout: options.timeout || 15000,
      maxRedirects: options.allowRedirects !== false ? 5 : 0,
      responseType: 'text',
      ...options.axiosOptions,
    });
    return data;
  } catch (err) {
    if (err.response?.status === 403) {
      const body = await cloudscraper({
        uri: url,
        headers: { ...DEFAULT_HEADERS, ...options.headers },
        followAllRedirects: options.allowRedirects !== false,
        timeout: options.timeout || 15000,
      });
      return body;
    }
    throw err;
  }
}

export async function fetchPage(url, options = {}) {
  return fetchWithFallback(url, options);
}

export async function fetchJSON(url, options = {}) {
  const text = await fetchWithFallback(url, {
    ...options,
    headers: { ...DEFAULT_HEADERS, Accept: 'application/json,text/plain,*/*', ...options.headers },
  });
  return JSON.parse(text);
}

export async function postPage(url, bodyData, options = {}) {
  const contentType = options.form ? 'application/x-www-form-urlencoded' : 'application/json';
  const body = options.form ? new URLSearchParams(bodyData).toString() : JSON.stringify(bodyData);
  try {
    const { data } = await axios.post(url, body, {
      headers: { ...DEFAULT_HEADERS, 'Content-Type': contentType, ...options.headers },
      timeout: options.timeout || 15000,
    });
    return data;
  } catch (err) {
    if (err.response?.status === 403) {
      const result = await cloudscraper({
        uri: url,
        method: 'POST',
        headers: { ...DEFAULT_HEADERS, 'Content-Type': contentType, ...options.headers },
        body,
        followAllRedirects: options.allowRedirects !== false,
        timeout: options.timeout || 15000,
      });
      return result;
    }
    throw err;
  }
}

export async function postFormData(url, formData, options = {}) {
  try {
    const { data } = await axios.post(url, formData, {
      headers: { ...DEFAULT_HEADERS, ...options.headers },
      timeout: options.timeout || 15000,
    });
    return data;
  } catch (err) {
    if (err.response?.status === 403) {
      const result = await cloudscraper({
        uri: url,
        method: 'POST',
        headers: { ...DEFAULT_HEADERS, ...options.headers },
        formData,
        followAllRedirects: options.allowRedirects !== false,
        timeout: options.timeout || 15000,
      });
      return result;
    }
    throw err;
  }
}
