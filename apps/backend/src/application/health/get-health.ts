import { getHealthStatus, HealthStatus } from '../../domain/health/health-status';

export class GetHealth {
  execute(): HealthStatus {
    return getHealthStatus();
  }
}