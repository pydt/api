import { Container, inject } from 'inversify';
import { buildProviderModule, fluentProvide, provide } from 'inversify-binding-decorators';
import { ServiceIdentifier } from 'tsoa';

const iocContainer = new Container();
let initialized = false;

// eslint-disable-next-line
const provideSingleton = (identifier: ServiceIdentifier<any>) => {
  return fluentProvide(identifier).inSingletonScope().done();
};

function initContainer() {
  if (!initialized) {
    iocContainer.load(buildProviderModule());
    initialized = true;
  }
}

export { iocContainer, initContainer, provide, provideSingleton, inject };
