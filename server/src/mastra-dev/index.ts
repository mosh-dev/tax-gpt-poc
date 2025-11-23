import { PinoLogger } from '@mastra/loggers';
import { Mastra } from '@mastra/core';

export const mastra = new Mastra({
  workflows: {  },
  agents: {  },
  scorers: {  },
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  })
});
