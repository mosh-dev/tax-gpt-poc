import { asClass, asValue } from 'awilix';
import { containerRegistry, symbolRegistry } from '@/app/di-container/container-registry';

function getSymbol(key: string): symbol {
  if (!symbolRegistry.has(key)) {
    symbolRegistry.set(key, Symbol(key));
  }
  return symbolRegistry.get(key)!;
}

export function registerToContainer<T>(refOrKey: any, value?: T): symbol {
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

  const symbol = getSymbol(key);
  containerRegistry.register({
    [symbol]: registration
  });

  return symbol;
}

export function injectFromContainer<T>(refOrKey: new (...args: any[]) => T): T;
export function injectFromContainer<T>(refOrKey: string): T;
export function injectFromContainer<T>(refOrKey: any): T {
  let key: string;

  if (typeof refOrKey === 'function' && refOrKey.prototype) {
    key = refOrKey.name;
  } else {
    key = String(refOrKey);
  }

  const symbol = getSymbol(key);
  try {
    return containerRegistry.resolve<T>(symbol);
  } catch {
    throw new Error(`injectFromContainer must be called from a injection context: ${key}`);
  }
}
