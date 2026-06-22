import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { QueueService } from './queue.service';

@Controller('admin/queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }
}
