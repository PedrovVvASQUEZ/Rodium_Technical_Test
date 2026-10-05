export class InvalidContactInputError extends Error {
  readonly code = 'INVALID_CONTACT_INPUT';

  constructor(message: string) {
    super(message);
    this.name = 'InvalidContactInputError';
  }
}

export class ContactNotFoundError extends Error {
  readonly code = 'CONTACT_NOT_FOUND';

  constructor(contactId: string) {
    super(`Contact not found: ${contactId}`);
    this.name = 'ContactNotFoundError';
  }
}