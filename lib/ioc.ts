import { Container, inject, interfaces } from 'inversify';
import { buildProviderModule, fluentProvide, provide } from 'inversify-binding-decorators';

const iocContainer = new Container();
let initialized = false;

// eslint-disable-next-line
const provideSingleton = (identifier: string | symbol | interfaces.Newable<any> | interfaces.Abstract<any>) => {
  return fluentProvide(identifier).inSingletonScope().done();
};

function initContainer() {
  if (!initialized) {
    iocContainer.load(buildProviderModule());
    initialized = true;
  }
}

export { iocContainer, initContainer, provide, provideSingleton, inject };
