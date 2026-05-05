const BASE_URL = 'https://whisperbox.koyeb.app';

function getToken() {
  return sessionStorage.getItem('authToken');
}

async function fetchWithAuth(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function register(username, password) {
  return fetchWithAuth('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function login(username, password) {
  const data = await fetchWithAuth('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (data.token) sessionStorage.setItem('authToken', data.token);
  return data;
}

export function logout() {
  sessionStorage.removeItem('authToken');
}

export async function getUsers() {
  return fetchWithAuth('/users');
}

export async function uploadPublicKey(publicKeyBase64) {
  return fetchWithAuth('/keys', {
    method: 'POST',
    body: JSON.stringify({ publicKey: publicKeyBase64 }),
  });
}

export async function getUserPublicKey(userId) {
  const data = await fetchWithAuth(`/keys/${userId}`);
  return data.publicKey; 
}

export async function sendMessage(recipientId, encryptedMessage, encryptedAesKey, iv) {
  return fetchWithAuth('/messages', {
    method: 'POST',
    body: JSON.stringify({
      recipientId,
      encryptedMessage,
      encryptedAesKey,
      iv,
    }),
  });
}

export async function fetchMessages() {
  return fetchWithAuth('/messages'); 
}