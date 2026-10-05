import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { ListColumns } from '../../application/columns/list-columns';
import { CreateColumnUseCase, DeleteColumnUseCase, RenameColumnUseCase, ReorderColumnsUseCase } from '../../application/columns/manage-columns';
import { ColumnRepository } from '../../application/columns/column-repository';
import { ListContacts } from '../../application/contacts/list-contacts';
import { CreateContact } from '../../application/contacts/create-contact';
import { DeleteContact } from '../../application/contacts/delete-contact';
import { UpdateContactValue } from '../../application/contacts/update-contact-value';
import { ContactRepository } from '../../domain/contacts/contact-repository';
import { createPostgresPool } from '../../infrastructure/persistence/postgres-client';
import { PostgresColumnRepository } from '../../infrastructure/persistence/postgres-column-repository';
import { PostgresContactRepository } from '../../infrastructure/persistence/postgres-contact-repository';
import { PostgresPoolLifecycle } from '../../infrastructure/persistence/postgres-pool-lifecycle';
import { ColumnsController } from './columns.controller';
import { ContactsController } from './contacts.controller';
import { HealthController } from './health.controller';
import {
  COLUMN_REPOSITORY, CONTACT_REPOSITORY, CREATE_CONTACT, DATABASE_POOL, DELETE_CONTACT,
  LIST_COLUMNS, LIST_CONTACTS, UPDATE_CONTACT_VALUE,
  CREATE_COLUMN, DELETE_COLUMN, RENAME_COLUMN, REORDER_COLUMNS,
} from './provider-tokens';

@Module({
  controllers: [HealthController, ColumnsController, ContactsController],
  providers: [
    { provide: DATABASE_POOL, useFactory: createPostgresPool },
    {
      provide: COLUMN_REPOSITORY,
      useFactory: (pool: Pool) => new PostgresColumnRepository(pool),
      inject: [DATABASE_POOL],
    },
    {
      provide: CONTACT_REPOSITORY,
      useFactory: (
        pool: Pool,
        columnRepository: ColumnRepository,
      ) => new PostgresContactRepository(pool, columnRepository),
      inject: [DATABASE_POOL, COLUMN_REPOSITORY],
    },
    {
      provide: LIST_COLUMNS,
      useFactory: (repository: ColumnRepository) => new ListColumns(repository),
      inject: [COLUMN_REPOSITORY],
    },
    { provide: CREATE_COLUMN, useFactory: (repository: ColumnRepository) => new CreateColumnUseCase(repository), inject: [COLUMN_REPOSITORY] },
    { provide: RENAME_COLUMN, useFactory: (repository: ColumnRepository) => new RenameColumnUseCase(repository), inject: [COLUMN_REPOSITORY] },
    { provide: DELETE_COLUMN, useFactory: (repository: ColumnRepository) => new DeleteColumnUseCase(repository), inject: [COLUMN_REPOSITORY] },
    { provide: REORDER_COLUMNS, useFactory: (repository: ColumnRepository) => new ReorderColumnsUseCase(repository), inject: [COLUMN_REPOSITORY] },
    {
      provide: LIST_CONTACTS,
      useFactory: (repository: ContactRepository, columnRepository: ColumnRepository) => new ListContacts(repository, columnRepository),
      inject: [CONTACT_REPOSITORY, COLUMN_REPOSITORY],
    },
    {
      provide: CREATE_CONTACT,
      useFactory: (repository: ContactRepository, columnRepository: ColumnRepository) => new CreateContact(repository, columnRepository),
      inject: [CONTACT_REPOSITORY, COLUMN_REPOSITORY],
    },
    {
      provide: UPDATE_CONTACT_VALUE,
      useFactory: (repository: ContactRepository, columnRepository: ColumnRepository) => new UpdateContactValue(repository, columnRepository),
      inject: [CONTACT_REPOSITORY, COLUMN_REPOSITORY],
    },
    {
      provide: DELETE_CONTACT,
      useFactory: (repository: ContactRepository) => new DeleteContact(repository),
      inject: [CONTACT_REPOSITORY],
    },
    {
      provide: PostgresPoolLifecycle,
      useFactory: (pool: Pool) => new PostgresPoolLifecycle(pool),
      inject: [DATABASE_POOL],
    },
  ],
})
export class AppModule {}