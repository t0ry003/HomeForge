// apiClient.js - small helper for auth + profile usage

function getBackendUrl() {
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
}

function getApiBase() {
  return `${getBackendUrl()}/api`;
}

export function getAvatarUrl(path) {
  if (!path) return null;
  const backendUrl = getBackendUrl();
  const url = path.startsWith('http') ? path : `${backendUrl}${path}`;
  return `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
}

export async function registerUser({ username, email, password, first_name, last_name, role }) {
  const res = await fetch(`${getApiBase()}/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, first_name, last_name, role }),
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json(); // may include tokens depending on server; here registration returns created user
}

export async function login({ username, password }) {
  console.log('Login attempt:', { username, password });
  const res = await fetch(`${getApiBase()}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({detail:'Login failed'}));
    throw new Error(err.detail || 'Login failed');
  }
  const data = await res.json(); // { access, refresh }
  // store tokens (example using localStorage)
  localStorage.setItem('access', data.access);
  localStorage.setItem('refresh', data.refresh);
  return data;
}

export function getAuthHeaders() {
  const token = localStorage.getItem('access');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchWithAuth(url, options = {}) {
  const headers = { ...options.headers, ...getAuthHeaders() };
  
  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      const newHeaders = { ...options.headers, Authorization: `Bearer ${newToken}` };
      res = await fetch(url, { ...options, headers: newHeaders });
    } catch (error) {
      throw error;
    }
  }
  return res;
}

export async function fetchProfile() {
  const res = await fetchWithAuth(`${getApiBase()}/me/`);
  if (!res.ok) {
    const error = new Error('Failed to fetch profile');
    // @ts-ignore
    error.status = res.status;
    throw error;
  }
  return res.json(); // user object with profile.avatar and profile.role
}

export async function updateProfile({ first_name, last_name, role, avatarFile }) {
  // Use FormData for file upload
  const form = new FormData();
  if (first_name !== undefined) form.append('first_name', first_name);
  if (last_name !== undefined) form.append('last_name', last_name);
  if (role !== undefined) form.append('role', role);
  if (avatarFile) {
    form.append('avatar', avatarFile);
    console.log('Uploading avatar:', avatarFile.name, avatarFile.size, avatarFile.type);
  }

  const res = await fetchWithAuth(`${getApiBase()}/me/`, {
    method: 'PUT',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>({detail: 'Update failed'}));
    throw new Error(err.detail || 'Update failed');
  }
  return res.json();
}

export async function refreshAccessToken() {
  const refresh = localStorage.getItem('refresh');
  if (!refresh) {
    const e = new Error('No refresh token available');
    // @ts-ignore
    e.status = 401;
    throw e;
  }
  
  const res = await fetch(`${getApiBase()}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  
  if (!res.ok) {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    const e = new Error('Refresh failed');
    // @ts-ignore
    e.status = 401;
    throw e;
  }
  
  const data = await res.json(); // { access: '...' }
  localStorage.setItem('access', data.access);
  return data.access;
}
