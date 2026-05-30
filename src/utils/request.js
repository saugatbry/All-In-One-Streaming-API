import axios from 'axios';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
};

export async function fetchPage(url, options = {}) {
  const { data } = await axios.get(url, {
    headers: { ...DEFAULT_HEADERS, ...options.headers },
    timeout: options.timeout || 15000,
    maxRedirects: options.allowRedirects !== false ? 5 : 0,
    responseType: 'text',
    ...options.axiosOptions,
  });
  return data;
}

export async function fetchJSON(url, options = {}) {
  const { data } = await axios.get(url, {
    headers: { ...DEFAULT_HEADERS, Accept: 'application/json,text/plain,*/*', ...options.headers },
    timeout: options.timeout || 15000,
    responseType: 'json',
  });
  return data;
}

export async function postPage(url, data, options = {}) {
  const contentType = options.form ? 'application/x-www-form-urlencoded' : 'application/json';
  const body = options.form ? new URLSearchParams(data).toString() : JSON.stringify(data);
  const { data: response } = await axios.post(url, body, {
    headers: { ...DEFAULT_HEADERS, 'Content-Type': contentType, ...options.headers },
    timeout: options.timeout || 15000,
  });
  return response;
}

export async function postFormData(url, formData, options = {}) {
  const { data } = await axios.post(url, formData, {
    headers: { ...DEFAULT_HEADERS, ...options.headers },
    timeout: options.timeout || 15000,
  });
  return data;
}
