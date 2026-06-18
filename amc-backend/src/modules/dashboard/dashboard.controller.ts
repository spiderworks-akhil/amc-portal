import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @HttpCode(HttpStatus.OK)
  async getOverview(
    @Query('manager_id') managerId?: string,
  ) {
    return this.dashboardService.getOverview(managerId);
  }

  @Get('summary')
  @HttpCode(HttpStatus.OK)
  async getSummary() {
    return this.dashboardService.getSummary();
  }
}
