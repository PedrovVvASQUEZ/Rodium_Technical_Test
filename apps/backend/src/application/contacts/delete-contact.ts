import { ContactRepository } from '../../domain/contacts/contact-repository';
import { validateContactId } from './contact-validation';

export class DeleteContact {
  constructor(private readonly repository: ContactRepository) {}

  execute(contactId: string): Promise<void> {
    validateContactId(contactId);
    return this.repository.deleteById(contactId);
  }
}