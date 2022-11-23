import type {
  CollectionReference,
  DocumentData,
  DocumentReference,
  Firestore,
  Query,
} from "@google-cloud/firestore";
import DataLoader from "dataloader";
import GenericConverter from "./GenericConverter";
import {
  checkValidCollectionSegments,
  checkValidDocumentSegments,
} from "./utils";

/**
 * Provides memoisation for Firestore queries.
 */
export default class FirestoreCollectionLoader<
  DocumentModel extends DocumentData
> {
  protected dataLoader: DataLoader<string, DocumentModel>;
  protected firestore: Firestore;
  protected collectionNames: string[];

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
   * @param {string[]} collectionNames The names of the Firestore collections.
   */
  constructor(firestore: Firestore, ...collectionNames: string[]) {
    if (collectionNames.length === 0)
      throw new Error("Collection names must be specified.");

    // Ensure that no collection names contain slashes
    if (collectionNames.some((collectionName) => collectionName.includes("/")))
      throw new Error("Collection names cannot contain slashes.");

    // Save Firestore instance and collection names
    this.firestore = firestore;
    this.collectionNames = collectionNames;

    // Initialise data loader to provide memoisation
    this.dataLoader = new DataLoader<string, DocumentModel>(
      this.batchLoad.bind(this)
    );
  }

  /**
   * Loads a list of documents.
   *
   * @param {ReadonlyArray<string>} docPaths Path (segments seperated by
   * slashes) of the documents to be added.
   *
   * @return {Promise<ArrayLike<DocumentModel | Error>>}
   */
  protected async batchLoad(
    docPaths: ReadonlyArray<string>
  ): Promise<ArrayLike<DocumentModel | Error>> {
    const docProms: Promise<DocumentModel | Error>[] = [];

    // Get each document
    for (const docPath of docPaths) {
      docProms.push(
        new Promise((resolve, reject) => {
          const docSegments = docPath.split("/");
          const docNames = this.getDocNamesFromSegments(...docSegments);

          // Resolve with the document data
          this.getDocRef(...docNames)
            .get()
            .then((snap) => {
              // Resolve with the document data
              const data = snap.data();

              if (data === undefined) {
                reject(new Error(`Document ${docPath} does not exist.`));
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
   * Finds a Firestore collection reference based off the given doc names.
   *
   * @example
   * // If this.collectionNames === ['users'], this returns a reference to the
   * // users collection
   * getCollectionRef();
   *
   * @example
   * // If this.collectionNames === ['users', 'posts'], this returns a reference
   * // to the posts subcollection of the document with id 'jsmith' in the users
   * // collection
   * getCollectionRef('jsmith');
   *
   * @param {string[]} docNames The names of the Firestore documents. Assumes
   * this is the same length as this.collectionNames.
   *
   * @return {CollectionReference<DocumentModel>} A Firestore collection reference.
   */
  protected getCollectionRef(
    ...docNames: string[]
  ): CollectionReference<DocumentModel> {
    let collection = this.firestore.collection(this.collectionNames[0]);

    // Add each following pair of doc and collection names as a subcollection
    for (let i = 0; i < docNames.length; i++)
      collection = collection
        .doc(docNames[i])
        .collection(this.collectionNames[i + 1]);

    return collection as CollectionReference<DocumentModel>;
  }

  /**
   * Finds a document reference based off the given doc names.
   *
   * @example
   * // If this.collectionNames === ['users'], this returns ['users', 'jsmith']
   * getDocRef('jsmith');
   *
   * @example
   * // If this.collectionNames === ['users', 'posts'], this returns
   * // ['users', 'jsmith', 'posts', 'post1']
   * getDocRef('jsmith', 'post1');
   *
   * @param {string[]} docNames The names of the Firestore documents. Assumes
   * this is one less than the length of this.collectionNames.
   *
   * @return {DocumentReference<DocumentModel>} The collection reference.
   */
  protected getDocRef(...docNames: string[]): DocumentReference<DocumentModel> {
    // Get the first doc reference
    let docRef: DocumentReference<DocumentData> | Firestore = this.firestore;

    // Add each pair of collection and doc names
    for (let i = 0; i < docNames.length; i++)
      docRef = docRef.collection(this.collectionNames[i]).doc(docNames[i]);

    return (docRef as DocumentReference<DocumentData>).withConverter(
      new GenericConverter<DocumentModel>()
    );
  }

  /**
   * Finds a collection's segments based off the given doc names.
   *
   * @example
   * // If this.collectionNames === ['users'], this returns ['users']
   * getCollectionSegments();
   *
   * @example
   * // If this.collectionNames === ['users', 'posts'], this returns
   * // ['users', 'jsmith', 'posts']
   * getCollectionSegments('jsmith');
   *
   * @param {string[]} docNames The names of the Firestore documents. Assumes
   * this is the same length as this.collectionNames.
   *
   * @return {string[]} The segments denoting a collection.
   */
  protected getCollectionSegments(...docNames: string[]): string[] {
    const segments = [this.collectionNames[0]];

    // Add each following pair of doc and collection names elements as a subcollection
    for (let i = 0; i < docNames.length; i++)
      segments.push(docNames[i], this.collectionNames[i + 1]);

    return segments;
  }

  /**
   * Finds a document's segments based off the given doc names.
   *
   * @example
   * // If this.collectionNames === ['users'], this returns ['users', 'jsmith']
   * getDocSegments('jsmith');
   *
   * @example
   * // If this.collectionNames === ['users', 'posts'], this returns
   * // ['users', 'jsmith', 'posts', 'post1']
   * getDocSegments('jsmith', 'post1');
   *
   * @param {string[]} docNames The names of the Firestore documents. Assumes
   * this is one less than the length of this.collectionNames.
   *
   * @return {string[]} The segments denoting a doc.
   */
  protected getDocSegments(...docNames: string[]): string[] {
    const segments: string[] = [];

    // Add each pair of collection and doc names
    for (let i = 0; i < docNames.length; i++)
      segments.push(this.collectionNames[i], docNames[i]);

    return segments;
  }

  /**
   * Finds document names based on the segments of a document.
   *
   * @example
   * // This returns ['jsmith']
   * getDocSegments('users', 'jsmith');
   *
   * @example
   * // This returns ['jsmith', 'post1']
   * getDocSegments('users', 'jsmith', 'posts', 'post1');
   *
   * @param {string[]} segments The segments of the Firestore document. Assumes
   * every odd segment (a collection name) is in this.collectionNames.
   *
   * @return {string[]} The doc names corresponding to the segments.
   */
  protected getDocNamesFromSegments(...segments: string[]): string[] {
    const docNames: string[] = [];

    // Add each pair of collection and doc names
    for (let i = 1; i < segments.length; i += 2) docNames.push(segments[i]);

    return docNames;
  }

  /**
   * Reads a single document from Firestore.
   *
   * @param {string[]} docNames The names of the Firestore documents that lead
   * to the document to read. This must be one less than the length of
   * this.collectionNames.
   *
   * @example
   * // This returns the contents of the document 'users/jsmith'
   * const firestore = getFirestore();
   * const users =
   *  new FirestoreDataLoader<UserDoc>(firestore, 'users');
   * users.getDoc('jsmith');
   *
   * @example
   * // This returns the contents of the document 'users/jsmith/posts/post1'
   * const firestore = getFirestore();
   * const userPosts =
   *  new FirestoreDataLoader<UserDoc>(firestore, 'users', 'posts');
   * userPosts.getDoc('jsmith', 'post1');
   *
   * @return {Promise<DocumentModel>} The document.
   */
  async getDoc(...docNames: string[]): Promise<DocumentModel> {
    if (docNames.length === 0)
      throw new Error("Document names must be specified.");

    // Ensure that no doc names contain slashes
    if (docNames.some((docName) => docName.includes("/")))
      throw new Error("Document names cannot contain slashes.");

    checkValidDocumentSegments(this.collectionNames, docNames);

    // Ensure that no document names contain slashes
    if (docNames.some((docName) => docName.includes("/")))
      throw new Error("Document names cannot contain slashes.");

    return this.dataLoader.load(this.getDocSegments(...docNames).join("/"));
  }

  /**
   * Reads multiple documents from Firestore by query. The query is not saved,
   * but the documents fetched are.
   *
   * @param {Function} queryFn A function that returns the query to be executed.
   *
   * @param {string[]} docNames The names of the Firestore documents that lead
   * to the collection to query.
   *
   * @return {Promise<DocumentModel[]>} The documents in the collection.
   */
  async getQuery(
    queryFn: (
      collectionRef: CollectionReference<DocumentModel>
    ) => Query<DocumentModel>,
    ...docNames: string[]
  ): Promise<DocumentModel[]> {
    // Ensure that no doc names contain slashes
    if (docNames.some((docName) => docName.includes("/")))
      throw new Error("Document names cannot contain slashes.");

    checkValidCollectionSegments(this.collectionNames, docNames);

    // Get the query
    const collectionRef = this.getCollectionRef(...docNames);
    const snap = await queryFn(collectionRef).get();

    const docs: DocumentModel[] = [];

    // Add each document to the array
    snap.forEach((doc) => {
      const path = this.getDocSegments(...docNames, doc.id).join("/");
      const data = doc.data();

      docs.push(data);
      this.dataLoader.prime(path, data);
    });

    return docs;
  }
}
