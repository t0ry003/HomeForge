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

// Helper to handle API errors globally matching backend format
async function handleApiError(res, defaultMsg) {
  let errorData;
  try {
    errorData = await res.json();
  } catch (e) {
    throw new Error(defaultMsg || `Request failed with status ${res.status}`);
  }

  if (errorData) {
    // 1. Check for specific "detail" (Permission errors, etc.)
    if (typeof errorData.detail === 'string') {
      throw new Error(errorData.detail);
    }
    
    // 2. Check for "non_field_errors"
    if (Array.isArray(errorData.non_field_errors)) {
       throw new Error(errorData.non_field_errors.join(' '));
    }

    // 3. Field errors
    const parts = [];
    for (const [key, value] of Object.entries(errorData)) {
      // Backend usually sends array of strings for field errors
      if (Array.isArray(value)) {
        parts.push(`${key}: ${value.join(' ')}`);
      } else if (typeof value === 'string') {
        parts.push(`${key}: ${value}`);
      }
    }
    
    if (parts.length > 0) {
      // Join with newline or something readable
      throw new Error(parts.join('\n'));
    }
  }
  
  throw new Error(defaultMsg || `Request failed with status ${res.status}`);
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
  if (!res.ok) await handleApiError(res, 'Registration failed');
  return res.json();
}

export async function login({ username, password }) {
  console.log('Login attempt:', { username, password });
  const res = await fetch(`${getApiBase()}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  });
  if (!res.ok) await handleApiError(res, 'Login failed');
  
  const data = await res.json(); 
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
  if (!res.ok) await handleApiError(res, 'Failed to fetch profile');
  return res.json();
}

export async function updateProfile({ first_name, last_name, username, email, password, role, accent_color, avatarFile }) {
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
  }

  const res = await fetchWithAuth(`${getApiBase()}/me/`, {
    method: 'PUT',
    body: form,
  });
  if (!res.ok) await handleApiError(res, 'Update failed');
  return res.json();
}

export async function refreshAccessToken() {
  const refresh = localStorage.getItem('refresh');
  if (!refresh) {
    const e = new Error('No refresh token available');
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
    e.status = 401;
    throw e;
  }
  
  const data = await res.json();
  localStorage.setItem('access', data.access);
  return data.access;
}

export async function fetchTopology() {
  const res = await fetchWithAuth(`${getApiBase()}/topology/`);
  if (!res.ok) await handleApiError(res, 'Failed to fetch topology');
  return res.json();
}

// --- Rooms ---

export async function fetchRooms() {
  const res = await fetchWithAuth(`${getApiBase()}/rooms/`);
  if (!res.ok) await handleApiError(res, 'Failed to fetch rooms');
  return res.json();
}

export async function createRoom(data) {
  const res = await fetchWithAuth(`${getApiBase()}/rooms/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await handleApiError(res, 'Failed to create room');
  return res.json();
}

export async function updateRoom(id, data) {
  const res = await fetchWithAuth(`${getApiBase()}/rooms/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await handleApiError(res, 'Failed to update room');
  return res.json();
}

export async function deleteRoom(id) {
  const res = await fetchWithAuth(`${getApiBase()}/rooms/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) await handleApiError(res, 'Failed to delete room');
  return true;
}

// --- Users (Admin) ---

export async function fetchUsers() {
  const res = await fetchWithAuth(`${getApiBase()}/users/`);
  if (!res.ok) await handleApiError(res, 'Failed to fetch users');
  return res.json();
}

export async function updateUserAdmin(id, data) {
  const res = await fetchWithAuth(`${getApiBase()}/users/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await handleApiError(res, 'Failed to update user');
  return res.json();
}

export async function deleteUser(id) {
  const res = await fetchWithAuth(`${getApiBase()}/users/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) await handleApiError(res, 'Failed to delete user');
  return true;
}

// --- Device Types ---

export async function fetchDeviceTypes() {
  const res = await fetchWithAuth(`${getApiBase()}/device-types/`);
  if (!res.ok) await handleApiError(res, 'Failed to fetch device types');
  return res.json();
}

export async function createDeviceType(data) {
    const res = await fetchWithAuth(`${getApiBase()}/device-types/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) await handleApiError(res, 'Failed to create device type');
    return res.json();
  }

export async function approveDeviceType(id) {
  const res = await fetchWithAuth(`${getApiBase()}/device-types/${id}/approve/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
  if (!res.ok) await handleApiError(res, 'Failed to approve device type');
  return res.json();
}

export async function deleteDeviceType(id) {
  const res = await fetchWithAuth(`${getApiBase()}/device-types/${id}/`, {
    method: 'DELETE',
  });
  if (!res.ok) await handleApiError(res, 'Failed to delete device type');
  return true;
}

// --- User Device Type Proposal ---

export async function proposeDeviceType(data) {
  const res = await fetchWithAuth(`${getApiBase()}/device-types/propose/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await handleApiError(res, 'Failed to propose device type');
  return res.json();
}

// --- Devices ---

export async function fetchDevices() {
  const res = await fetchWithAuth(`${getApiBase()}/devices/`);
  if (!res.ok) await handleApiError(res, 'Failed to fetch devices');
  return res.json();
}

export async function registerDevice(data) {
  const res = await fetchWithAuth(`${getApiBase()}/devices/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) await handleApiError(res, 'Failed to register device');
  return res.json();
}
