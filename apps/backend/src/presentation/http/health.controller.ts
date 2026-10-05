import { Controller, Get } from '@nestjs/common';
import { GetHealth } from '../../application/health/get-health';

@Controller('health')
export class HealthController {
  private readonly getHealth = new GetHealth();

  @Get()
  read() {
    return this.getHealth.execute();
  }
}