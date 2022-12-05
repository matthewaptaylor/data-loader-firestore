import type {
  CollectionReference,
  CollectionGroup,
  DocumentReference,
  Firestore,
  Query,
  DocumentData,
} from "@google-cloud/firestore";
import DataLoader from "dataloader";
import GenericConverter from "./GenericConverter";
import { OutputDocumentData } from "./types";
import {
  checkValidCollectionSegments,
  checkValidDocumentSegments,
} from "./utils";

/**
 * Provides memoisation for Firestore queries.
 */
export class FirestoreCollectionLoader<T extends DocumentData> {
  dataLoader: DataLoader<string, OutputDocumentData<T>>;
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
    this.dataLoader = new DataLoader<string, OutputDocumentData<T>>(
      this.batchLoad.bind(this)
    );
  }

  /**
   * Loads a list of documents.
   *
   * @param {ReadonlyArray<string>} docPaths Path (segments seperated by
   * slashes) of the documents to be added.
   *
   * @return {Promise<ArrayLike<OutputDocumentData<T> | Error>>}
   */
  protected async batchLoad(
    docPaths: ReadonlyArray<string>
  ): Promise<ArrayLike<OutputDocumentData<T> | Error>> {
    const docProms: Promise<OutputDocumentData<T> | Error>[] = [];

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
   * // to the posts subcollection of the document with ID 'jsmith' in the users
   * // collection
   * getCollectionRef('jsmith');
   *
   * @param {string[]} docNames The names of the Firestore documents. Assumes
   * this is the same length as this.collectionNames.
   *
   * @return {CollectionReference<T>} A Firestore collection reference.
   */
  protected getCollectionRef(
    ...docNames: string[]
  ): CollectionReference<OutputDocumentData<T>> {
    let collection = this.firestore.collection(this.collectionNames[0]);

    // Add each following pair of doc and collection names as a subcollection
    for (let i = 0; i < docNames.length; i++)
      collection = collection
        .doc(docNames[i])
        .collection(this.collectionNames[i + 1]);

    return collection.withConverter(new GenericConverter<T>());
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
   * @return {OutputDocumentData<T>} The collection reference.
   */
  protected getDocRef(
    ...docNames: string[]
  ): DocumentReference<OutputDocumentData<T>> {
    // Get the first doc reference
    let docRef: DocumentReference | Firestore = this.firestore;

    // Add each pair of collection and doc names
    for (let i = 0; i < docNames.length; i++)
      docRef = docRef.collection(this.collectionNames[i]).doc(docNames[i]);

    return (docRef as DocumentReference).withConverter(
      new GenericConverter<T>()
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
   * @example
   * // This returns the contents of the document 'users/jsmith'
   * const firestore = getFirestore();
   * const users =
   *  new FirestoreDataLoader<UserDoc>(firestore, 'users');
   * users.fetchDocById('jsmith');
   *
   * @example
   * // This returns the contents of the document 'users/jsmith/posts/post1'
   * const firestore = getFirestore();
   * const userPosts =
   *  new FirestoreDataLoader<UserDoc>(firestore, 'users', 'posts');
   * userPosts.fetchDocById('jsmith', 'post1');
   *
   * @param {string[]} docNames The names of the Firestore documents that lead
   * to the document to read. This must be one less than the length of
   * this.collectionNames.
   *
   * @return {Promise<T>} The document.
   */
  async fetchDocById(
    ...docNames: string[]
  ): Promise<OutputDocumentData<T> | undefined> {
    if (docNames.length === 0)
      throw new Error("Document names must be specified.");

    // Ensure that no doc names contain slashes
    if (docNames.some((docName) => docName.includes("/")))
      throw new Error("Document names cannot contain slashes.");

    checkValidDocumentSegments(this.collectionNames, docNames);

    // Ensure that no document names contain slashes
    if (docNames.some((docName) => docName.includes("/")))
      throw new Error("Document names cannot contain slashes.");

    let doc;

    try {
      doc = await this.dataLoader.load(
        this.getDocSegments(...docNames).join("/")
      );
    } catch {
      doc = undefined;
    }

    return doc;
  }

  /**
   * Reads multiple documents from Firestore by query. The query is not saved,
   * but the documents fetched are.
   *
   * @see https://firebase.google.com/docs/firestore/query-data/queries
   *
   * @example
   * // This returns an array of documents in the users collection where the
   * // field 'role' equals 'student'
   * const users = new FirestoreDataLoader(firestore, "users");
   * const students = await users.fetchDocsByQuery((usersCollection) =>
   *  usersCollection.where("role", "==", "student")
   * );
   *
   * @example
   * // This returns an array of documents in the users/jdoe/posts collection
   * // where the field 'title' equals 'Post 1'
   * const userPosts = new FirestoreDataLoader(firestore, "users", "posts");
   * const students = await users.fetchDocsByQuery((usersCollection) =>
   *  usersCollection.where("role", "==", "student"),
   *  "jdoe"
   * );
   *
   * @param {Function} queryFn A function that returns the query to be executed.
   *
   * @param {string[]} docNames The names of the Firestore documents that lead
   * to the collection to query.
   *
   * @return {Promise<OutputDocumentData<T>[]>} The documents in the collection.
   */
  async fetchDocsByQuery(
    queryFn: (
      collectionRef: CollectionReference<OutputDocumentData<T>>
    ) => Query<OutputDocumentData<T>>,
    ...docNames: string[]
  ): Promise<OutputDocumentData<T>[]> {
    // Ensure that no doc names contain slashes
    if (docNames.some((docName) => docName.includes("/")))
      throw new Error("Document names cannot contain slashes.");

    checkValidCollectionSegments(this.collectionNames, docNames);

    // Get the query
    const collectionRef = this.getCollectionRef(...docNames);
    const snap = await queryFn(collectionRef).get();

    const docs: OutputDocumentData<T>[] = [];

    // Add each document to the array
    snap.forEach((doc) => {
      const path = doc.ref.path;
      const data = doc.data();

      docs.push(data);
      this.dataLoader.prime(path, data);
    });

    return docs;
  }

  /**
   * Reads multiple documents from Firestore by a collection group query. The
   * query is not saved, but the documents fetched are. Note that this method
   * fetches the collection group of the last collection name given during
   * construction.
   *
   * @example
   * // This returns an array of documents in every collection, no matter the
   * // path, where the field 'title' equals 'Post 1'. Note that this would
   * // also return any documents in a 'organisations' 'posts' subcollection,
   * // for example.
   * const userPosts = new FirestoreDataLoader(firestore, "users", "posts");
   * const students = await users.fetchDocsByQuery((usersCollection) =>
   *  usersCollection.where("role", "==", "student")
   * );
   *
   * @param {Function} queryFn A function that returns the query to be executed.
   *
   * @return {Promise<OutputDocumentData<T>[]>} The documents in the collection group.
   */
  async fetchDocsByCollectionGroupQuery(
    queryFn: (
      collectionRef: CollectionGroup<OutputDocumentData<T>>
    ) => Query<OutputDocumentData<T>>
  ): Promise<OutputDocumentData<T>[]> {
    // Get the query
    const collectionRef = this.firestore
      .collectionGroup(this.collectionNames[this.collectionNames.length - 1])
      .withConverter(new GenericConverter<T>());
    const snap = await queryFn(collectionRef).get();

    const docs: OutputDocumentData<T>[] = [];

    // Add each document to the array
    snap.forEach((doc) => {
      const path = doc.ref.path;
      const data = doc.data();

      docs.push(data);
      this.dataLoader.prime(path, data);
    });

    return docs;
  }

  /**
   * Fetches all documents in a collection. This is a convenience method for
   * fetchDocsByQuery.
   *
   * @param {string[]} docNames The names of the Firestore documents that lead
   * to the collection to query.
   *
   * @return {Promise<OutputDocumentData<T>[]>} The documents in the collection.
   */
  async fetchDocs(...docNames: string[]) {
    return this.fetchDocsByQuery((collectionRef) => collectionRef, ...docNames);
  }

  /**
   * Creates a document in Firestore.
   *
   * @example
   * // This creates a document in the users collection with the ID 'jsmith'
   * const users = new FirestoreDataLoader(firestore, "users");
   * await users.createDoc(
   *  { firstName: "John", lastName: "Smith" },
   *  "jsmith"
   * );
   *
   * @example
   * // This creates a document in the users/jsmith/posts collection with a
   * generated ID
   * const userPosts = new FirestoreDataLoader(firestore, "users", "posts");
   * await userPosts.createDoc(
   *  { firstName: "John", lastName: "Smith" },
   *  "jsmith"
   * );
   *
   * @param {T} data The data to write to the document.
   *
   * @param {boolean} overwrite Whether to overwrite the document if it already
   * exists. If false, the new document will be merged with the existing data.
   *
   * @param {string[]} docNames The names of the Firestore documents that lead to the
   * document to create. If equal to the length of this.collectionNames, the
   * document is created in the collection. If one less than the length of
   * this.collectionNames, the document is created in the collection with a
   * generated ID.
   *
   * @return {Promise<OutputDocumentData<T>>} The document written.
   */
  async createDoc(
    data: Partial<T> | T,
    overwrite: boolean,
    ...docNames: string[]
  ): Promise<OutputDocumentData<T> | undefined> {
    // Ensure that no doc names contain slashes
    if (docNames.some((docName) => docName.includes("/")))
      throw new Error("Document names cannot contain slashes.");

    let docRef: DocumentReference<OutputDocumentData<T>> | undefined;

    try {
      // Try to create the document with a specified ID
      checkValidDocumentSegments(this.collectionNames, docNames);
      docRef = this.getDocRef(...docNames); // Get the document reference
    } catch (err) {
      if ((err as Error).name !== "InvalidDocumentNamesError") throw err;

      // Try to create the document with a generated ID
      checkValidCollectionSegments(this.collectionNames, docNames);
      docRef = this.getCollectionRef(...docNames).doc(); // Get the collection reference
    }

    // Create the document
    const dataToWrite: OutputDocumentData<Partial<T> | T> = {
      ...data,
      _id: docRef.id,
      _path: docRef.path,
    };
    await docRef.set(dataToWrite, { merge: !overwrite });

    console.log("Created document", docRef.path);

    return this.fetchDocById(
      ...this.getDocNamesFromSegments(...docRef.path.split("/"))
    );
  }
}
