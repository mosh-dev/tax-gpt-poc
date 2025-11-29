import { asClass, asValue, createContainer, InjectionMode, NameAndRegistrationPair } from 'awilix';

const containerRegistry = createContainer({
  injectionMode: InjectionMode.PROXY,
  strict: true
});

type RegistrationItem = | { class: new (...args: any[]) => any } | { key: string; value: any };

export function initializeContainer(registrations: RegistrationItem[]): void;
export function initializeContainer(nameAndRegistrationPair: NameAndRegistrationPair<any>): void;
export function initializeContainer<T>(classRef: new (...args: any[]) => T): string;
export function initializeContainer<T>(key: string, value: T): string;
export function initializeContainer<T>(refOrKey: any, value?: T): string | void {
  // Array registration mode
  if (Array.isArray(refOrKey)) {
    const registrations: NameAndRegistrationPair<any> = {};

    for (const item of refOrKey) {
      if ('class' in item) {
        const classRef = item.class;
        registrations[classRef.name] = asClass(classRef).singleton();
      } else if ('key' in item && 'value' in item) {
        registrations[item.key] = asValue(item.value);
      } else {
        throw new Error(`Invalid registration item: ${JSON.stringify(item)}`);
      }
    }

    containerRegistry.register(registrations);
    return;
  }

  // NameAndRegistrationPair registration mode
  if (typeof refOrKey === 'object' && !refOrKey.prototype && value === undefined) {
    containerRegistry.register(refOrKey as NameAndRegistrationPair<any>);
    return;
  }

  // Single registration mode
  let key: string;
  let registration: any;

  if (value !== undefined) {
    key = String(refOrKey);
    registration = asValue(value);
  } else if (typeof refOrKey === 'function' && refOrKey.prototype) {
    key = refOrKey.name;
    registration = asClass(refOrKey).singleton();
  } else {
    throw new Error(`initializeContainer requires an array, a NameAndRegistrationPair object, a class, or a (key, value) pair. Got: ${typeof refOrKey} - ${refOrKey}`);
  }

  containerRegistry.register({
    [key]: registration
  });

  return key;
}


// noinspection JSUnusedGlobalSymbols
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
