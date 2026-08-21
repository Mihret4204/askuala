import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthStatus() {
    return {
      status: 'UP',
      system: 'Enterprise College Management System (SIS)',
      timestamp: new Date().toISOString(),
    };
  }
}
