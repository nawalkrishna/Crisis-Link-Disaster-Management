/**
 * Shapes of API responses. The API returns these, and the web app reads them,
 * so if one side changes a field the other side fails to compile.
 */
export interface HealthResponse {
  status: 'ok';
  service: 'crisislink-api';
  version: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
