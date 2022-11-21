import type {
  CollectionReference,
  DocumentData,
  DocumentReference,
  Firestore,
} from "@google-cloud/firestore";
import DataLoader from "dataloader";
import GenericConverter from "./GenericConverter";
import { checkValidCollectionPath, checkValidDocumentPath } from "./utils";

/**
 * Provides memoisation for Firestore queries.
 */
export class FirestoreDataLoader<DocumentModel extends DocumentData> {
  dataLoader: DataLoader<string, DocumentModel>;
  firestore: Firestore;
  collectionPath: string[];

  /**
   * Creates a new instance of the FirestoreDataLoader class.
   *
   * @example
   * // FirestoreDataLoader that refers to the users collection
   * const firestore = getFirestore();
   * new FirestoreDataLoader<UserDoc>(firestore, 'users');
   *
   * @example
   * // FirestoreDataLoader that refers to the posts subcollection of any document in the users collection
   * const firestore = getFirestore();
   * new FirestoreDataLoader<UserPostDoc>(firestore, 'users', 'posts');
   *
   * @param {Firestore} firestore The firestore instance.
   * @param {string[]} collectionPath The names of the Firestore collections.
   */
  constructor(firestore: Firestore, ...collectionPath: string[]) {
    if (collectionPath.length === 0)
      throw new Error("Collection path must be specified.");

    // Ensure that no collection names contain slashes
    if (collectionPath.some((collectionName) => collectionName.includes("/")))
      throw new Error("Collection names cannot contain slashes.");

    // Save Firestore instance and collection path
    this.firestore = firestore;
    this.collectionPath = collectionPath;

    // Initialise data loader to provide memoisation
    this.dataLoader = new DataLoader<string, DocumentModel>(this.#batchLoad);
  }

  /**
   * Loads a list of documents.
   * @param {ReadonlyArray<string>} docPaths Paths (denoted by slashes) to the documents to be added.
   * @return {Promise<ArrayLike<DocumentModel | Error>>}
   */
  async #batchLoad(
    docPaths: ReadonlyArray<string>
  ): Promise<ArrayLike<DocumentModel | Error>> {
    const docProms: Promise<DocumentModel | Error>[] = [];

    // Get each document
    for (const key of docPaths) {
      docProms.push(
        new Promise((resolve, reject) => {
          const docPath = key.split("/");

          // Resolve with the document data
          this.#getDocReference(...docPath)
            .get()
            .then((snap) => {
              // Resolve with the document data
              const data = snap.data();

              if (data === undefined) {
                reject(new Error(`Document ${key} does not exist.`));
              } else {
                resolve(data);
              }
            })
            .catch((e) => {
              // Reject with an error
              reject(e);
            });
        })
      );
    }

    return Promise.all(docProms);
  }

  /**
   * Finds a Firestore collection reference based off the given doc path.
   *
   * @example
   * // If this.collectionPath === ['users'], this returns a reference to the
   * // users collection
   * #getCollectionReference();
   *
   * @example
   * // If this.collectionPath === ['users', 'posts'], this returns a reference
   * // to the posts subcollection of the document with id 'jsmith' in the users
   * // collection
   * #getCollectionReference('jsmith');
   *
   * @param {string[]} docPath The names of the Firestore documents.
   *
   * @return {CollectionReference<DocumentModel>} A Firestore collection reference.
   */
  #getCollectionReference(
    ...docPath: string[]
  ): CollectionReference<DocumentModel> {
    checkValidCollectionPath(this.collectionPath, docPath);

    let collection = this.firestore.collection(this.collectionPath[0]);

    // Add each following pair of path elements as a subcollection
    for (let i = 0; i < docPath.length; i++)
      collection = collection
        .doc(docPath[i])
        .collection(this.collectionPath[i + 1]);

    return collection as CollectionReference<DocumentModel>;
  }

  /**
   * Finds a document path based off the given doc path.
   *
   * @example
   * // If this.collectionPath === ['users'], this returns ['users', 'jsmith']
   * #getDocReference('jsmith');
   *
   * @example
   * // If this.collectionPath === ['users', 'posts'], this returns
   * // ['users', 'jsmith', 'posts', 'post1']
   * #getDocReference('jsmith', 'post1');
   *
   * @param {string[]} docPath The names of the Firestore documents.
   *
   * @return {DocumentReference<DocumentModel>} The collection path.
   */
  #getDocReference(...docPath: string[]): DocumentReference<DocumentModel> {
    // Get the collection path
    let path: DocumentReference<DocumentData> = this.firestore
      .collection(this.collectionPath[0])
      .doc(docPath[0]);

    // Add each pair of path elements
    for (let i = 1; i < docPath.length; i++)
      path = path.collection(this.collectionPath[i]).doc(docPath[i]);

    return path.withConverter(new GenericConverter<DocumentModel>());
  }

  /**
   * Finds a collection path based off the given doc path.
   *
   * @example
   * // If this.collectionPath === ['users'], this returns ['users']
   * #getCollectionPath();
   *
   * @example
   * // If this.collectionPath === ['users', 'posts'], this returns
   * // ['users', 'jsmith', 'posts']
   * #getCollectionPath('jsmith');
   *
   * @param {string[]} docPath The names of the Firestore documents.
   *
   * @return {string[]} The collection path.
   */
  #getCollectionPath(...docPath: string[]): string[] {
    checkValidCollectionPath(this.collectionPath, docPath);

    const path = [this.collectionPath[0]];

    // Add each following pair of path elements as a subcollection
    for (let i = 0; i < docPath.length; i++)
      path.push(docPath[i], this.collectionPath[i + 1]);

    return path;
  }

  /**
   * Finds a document path based off the given doc path.
   *
   * @example
   * // If this.collectionPath === ['users'], this returns ['users', 'jsmith']
   * #getDocPath('jsmith');
   *
   * @example
   * // If this.collectionPath === ['users', 'posts'], this returns
   * // ['users', 'jsmith', 'posts', 'post1']
   * #getDocPath('jsmith', 'post1');
   *
   * @param {string[]} docPath The names of the Firestore documents.
   *
   * @return {string[]} The collection path.
   */
  #getDocPath(...docPath: string[]): string[] {
    // Get the collection path

    const path: string[] = [];

    // Add each pair of path elements
    for (let i = 0; i < docPath.length; i++)
      path.push(this.collectionPath[i + 1], docPath[i]);

    return path;
  }

  /**
   *
   * @param {string[]} docPath
   * @return {Promise<DocumentModel>}
   */
  async getDoc(...docPath: string[]): Promise<DocumentModel> {
    checkValidDocumentPath(this.collectionPath, docPath);

    // Ensure that no document names contain slashes
    if (docPath.some((docName) => docName.includes("/")))
      throw new Error("Document names cannot contain slashes.");

    return this.dataLoader.load(docPath.join("/"));
  }
}
