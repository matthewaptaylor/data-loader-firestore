import type {
  QueryDocumentSnapshot,
  FirestoreDataConverter,
  DocumentData,
} from "@google-cloud/firestore";
import { OutputDocumentData } from "./types";

/**
 * Converts a Firestore collection reference to a typed reference.
 */
export default class GenericConverter<T>
  implements FirestoreDataConverter<OutputDocumentData<T>>
{
  /**
   * Converts an object of type T to a Firestore doc.
   *
   * @param {OutputDocumentData<T>} data An object representing the Firestore
   * document's content.
   *
   * @return {DocumentData}
   */
  toFirestore(data: OutputDocumentData<T>): DocumentData {
    const firestoreData: DocumentData = { ...data };
    delete firestoreData._id;
    delete firestoreData._path;

    return firestoreData;
  }

  /**
   * Converts a Firestore snapshot to an object of type T.
   *
   * @param {QueryDocumentSnapshot} snapshot The Firestore document snapshot.
   *
   * @return {OutputDocumentData<T>}
   */
  fromFirestore(snapshot: QueryDocumentSnapshot): OutputDocumentData<T> {
    return {
      ...snapshot.data(),
      _id: snapshot.id,
      _path: snapshot.ref.path,
    } as OutputDocumentData<T>;
  }
}
