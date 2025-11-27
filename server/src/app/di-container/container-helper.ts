import { asClass, asValue } from 'awilix';
import { containerRegistry } from '@/app/di-container/container-registry';

export function registerToContainer<T>(refOrKey: any, value?: T): string {
  let key: string;
  let registration: any;

  if (value !== undefined) {
    key = String(refOrKey);
    registration = asValue(value);
  } else if (typeof refOrKey === 'function' && refOrKey.prototype) {
    key = refOrKey.name;
    registration = asClass(refOrKey).singleton();
  } else {
    throw new Error(`registerToContainer requires either a class or a (key, value) pair. Got: ${typeof refOrKey} - ${refOrKey}`);
  }

  containerRegistry.register({
    [key]: registration
  });

  return key;
}

export function injectFromContainer<T>(refOrKey: new (...args: any[]) => T): T;
export function injectFromContainer<T>(refOrKey: string): T;
export function injectFromContainer<T>(refOrKey: any): T {
  const key = typeof refOrKey === 'function' && refOrKey.prototype
    ? refOrKey.name
    : String(refOrKey);

  try {
    return containerRegistry.resolve<T>(key);
  } catch {
    throw new Error(`injectFromContainer must be called from a injection context: ${key}`);
  }
}
