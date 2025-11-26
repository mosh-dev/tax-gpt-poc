/**
 * Dependency Injection Container (TSyringe)
 */
import { container as tsyringeContainer, inject, injectable, singleton } from 'tsyringe';
import { TOKENS } from '@/app/container.tokens';

export { injectable, inject, singleton };
export const container = tsyringeContainer;

export function registerValue<T>(token: string, value: T): void {
  container.register(token, { useValue: value });
}

export function registerClass<T>(token: string, classConstructor: new (...args: any[]) => T): void {
  container.register(token, { useClass: classConstructor });
}

export function registerFactory<T>(token: string, factory: (container: typeof tsyringeContainer) => T): void {
  container.register(token, { useFactory: () => factory(container) });
}

export function initializeContainer(baseUrl: string): typeof tsyringeContainer {
  registerValue(TOKENS.BASE_URL, baseUrl);
  return container;
}
