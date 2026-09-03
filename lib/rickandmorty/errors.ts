export class RickAndMortyApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "RickAndMortyApiError";
  }
}

export class NotFoundError extends RickAndMortyApiError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
    this.name = "NotFoundError";
  }
}
