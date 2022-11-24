/**
 * The type of the data that is returned.
 */
export type OutputDocumentData<T> = T & {
  _id: string;
  _path?: string;
};
