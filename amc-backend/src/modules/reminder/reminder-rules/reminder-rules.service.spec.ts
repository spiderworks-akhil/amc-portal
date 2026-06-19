import { Test, TestingModule } from '@nestjs/testing';
import { ReminderRulesService } from './reminder-rules.service';

describe('ReminderRulesService', () => {
  let service: ReminderRulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReminderRulesService],
    }).compile();

    service = module.get<ReminderRulesService>(ReminderRulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
