import { Test, TestingModule } from '@nestjs/testing';
import { ReminderRulesController } from './reminder-rules.controller';
import { ReminderRulesService } from './reminder-rules.service';

describe('ReminderRulesController', () => {
  let controller: ReminderRulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReminderRulesController],
      providers: [ReminderRulesService],
    }).compile();

    controller = module.get<ReminderRulesController>(ReminderRulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
