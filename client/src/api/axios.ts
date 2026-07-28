import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends the httpOnly refresh cookie automatically
});

// Holds the access token in memory only — never localStorage/sessionStorage.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  try {
    const { data } = await api.post("/auth/refresh");
    setAccessToken(data.accessToken);
    return data.accessToken as string;
  } catch {
    setAccessToken(null);
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      // De-duplicate concurrent refresh calls if multiple requests 401 at once
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
