import { LoggerService } from '@infrastructure/logger/logger.service';

/**
 * Console-based logger implementation
 */
export class AgentLoggerService extends LoggerService {
  private readonly agentLogger = this.createNewLogger('TaxAgent');

  public logStreamError(error: any): void {
    this.agentLogger.error({
      event: 'stream-error',
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    }, 'Streaming Error');
  }

  public logLLMResponse(event: any): void {
    this.agentLogger.debug({
      event: 'llm-response',
      eventType: event.type,
      payload: event,
    }, `LLM Event: ${event.type}`);
  }

}
