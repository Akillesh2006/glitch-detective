import { AnalyzeRequest, AnalyzeResponse, HealthResponse } from './types';

// Read API Base URL from environment or default to backend port
const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:8000';

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
