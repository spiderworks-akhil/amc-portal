import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis.service';
import { Public } from 'src/modules/auth/decorators/public.decorator';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisService) {}
  @Public()
  @Get('test')
  async testRedis() {
    const redis = this.redisService.getClient();
    await redis.set('hello', 'world');
    return {
      value: await redis.get('hello'),
    };
  }
  @Public()
  @Get('cache/bust')
  async bustCache() {
    await this.redisService.bustDashboardCache();
    return { message: 'Cache busting completed' };
  }
}