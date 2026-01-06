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

export function logout() {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
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

export async function updateProfile({ first_name, last_name, username, email, password, role, accent_color, avatarFile }) {
  // Use FormData for file upload
  const form = new FormData();
  if (first_name !== undefined) form.append('first_name', first_name);
  if (last_name !== undefined) form.append('last_name', last_name);
  if (username !== undefined) form.append('username', username);
  if (email !== undefined) form.append('email', email);
  if (password !== undefined && password.trim() !== '') form.append('password', password);
  if (role !== undefined) form.append('role', role);
  if (accent_color !== undefined) form.append('accent_color', accent_color);
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

export async function fetchTopology() {
  const res = await fetchWithAuth(`${getApiBase()}/topology/`);
  if (!res.ok) {
    const error = new Error('Failed to fetch topology');
    // @ts-ignore
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// Room API functions
export async function fetchRooms() {
  const res = await fetchWithAuth(`${getApiBase()}/rooms/`);
  if (!res.ok) throw new Error('Failed to fetch rooms');
  return res.json();
}

export async function createRoom(data) {
  const res = await fetchWithAuth(`${getApiBase()}/rooms/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create room');
  return res.json();
}

export async function updateRoom(id, data) {
  const res = await fetchWithAuth(`${getApiBase()}/rooms/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update room');
  return res.json();
}

export async function deleteRoom(id) {
  const res = await fetchWithAuth(`${getApiBase()}/rooms/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete room');
}

// Device Type API functions
export async function fetchDeviceTypes() {
  const res = await fetchWithAuth(`${getApiBase()}/device-types/`);
  if (!res.ok) throw new Error('Failed to fetch device types');
  return res.json();
}

export async function createDeviceType(data) {
  const res = await fetchWithAuth(`${getApiBase()}/device-types/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create device type');
  return res.json();
}

export async function updateDeviceType(id, data) {
  const res = await fetchWithAuth(`${getApiBase()}/device-types/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update device type');
  return res.json();
}

export async function deleteDeviceType(id) {
  const res = await fetchWithAuth(`${getApiBase()}/device-types/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete device type');
}

// Device API functions
export async function fetchDevices() {
  const res = await fetchWithAuth(`${getApiBase()}/devices/`);
  if (!res.ok) throw new Error('Failed to fetch devices');
  return res.json();
}

export async function createDevice(data) {
  const res = await fetchWithAuth(`${getApiBase()}/devices/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create device');
  return res.json();
}

export async function updateDevice(id, data) {
  const res = await fetchWithAuth(`${getApiBase()}/devices/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update device');
  return res.json();
}

export async function deleteDevice(id) {
  const res = await fetchWithAuth(`${getApiBase()}/devices/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete device');
}

