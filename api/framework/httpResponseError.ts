export class HttpResponseError extends Error {
  public static createUnauthorized() {
    return new HttpResponseError(401, 'Unauthorized');
  }

  constructor(public statusCode: number, message: string) {
    super(message);

    // Set the prototype explicitly:
    // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    Object.setPrototypeOf(this, HttpResponseError.prototype);
  }
}
