import { DocumentData } from "@google-cloud/firestore";

/**
 * The type of the data that is returned.
 */
export type OutputDocumentData<T extends DocumentData> = T & {
  _id: string;
  _path?: string;
};
