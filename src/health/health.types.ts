export type HealthCheckStatus = 'up' | 'down' | 'disabled';

export type HealthStatus = 'ok' | 'error';

export type HealthCheckResult = {
  status: HealthCheckStatus;
  latencyMs?: number;
  message?: string;
};

export type HealthResponse = {
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  version: string;
  checks: {
    app: HealthCheckResult;
    database: HealthCheckResult;
  };
};
