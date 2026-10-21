import { AnalyzeRequest, AnalyzeResponse, HealthResponse } from './types';

// Read API Base URL from environment.
// In development, default to local backend 'http://localhost:8000' (or Vite proxy).
// In production, if VITE_API_BASE_URL is not set, default to '' (same-origin relative '/api' for unified Vercel deployment).
const rawApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const API_BASE_URL =
  rawApiBase !== undefined && rawApiBase.trim() !== ''
    ? rawApiBase.trim().replace(/\/$/, '')
    : import.meta.env.DEV
      ? 'http://localhost:8000'
      : '';

/**
 * Fetch health status from backend API.
 */
export async function checkHealth(): Promise<HealthResponse> {
  const url = `${API_BASE_URL}/api/health`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Send code snippet to backend analyze endpoint.
 */
export async function analyzeCode(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const url = `${API_BASE_URL}/api/analyze`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = `Server error (${response.status})`;
    try {
      const errorJson = await response.json();
      if (Array.isArray(errorJson.detail)) {
        errorDetail = errorJson.detail.map((d: { msg?: string }) => d.msg).join('; ');
      } else if (typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail;
      }
    } catch {
      // JSON parse failed, use fallback message
    }
    throw new Error(errorDetail);
  }

  return response.json();
}
