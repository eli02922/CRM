class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.publicMessage = message;
    this.details = details;
  }
}

module.exports = HttpError;
