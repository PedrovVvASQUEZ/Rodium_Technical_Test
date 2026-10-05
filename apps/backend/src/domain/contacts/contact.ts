import { ContactValue } from '../columns/column';

export type Contact = {
  id: string;
  values: Readonly<Record<string, ContactValue>>;
};