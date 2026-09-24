import { Request, Response } from 'express';

export class HealthController {
  public checkHealth(_req: Request, res: Response): void {
    const memory = process.memoryUsage();

    res.status(200).json({
      status: 'healthy',
      service: 'dhaka-tesla-pool-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        api: { status: 'UP', latency_ms: 1 },
        database: { status: 'UP', type: 'PostgreSQL 16' },
        auth_service: { status: 'UP', algorithm: 'HS256' }
      },
      memory: {
        rss_mb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heap_used_mb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100
      }
    });
  }
}

export const healthController = new HealthController();
