/**
 * Ensures that the given list of collection and document names will exactly
 * match a Firestore document path.
 * @param {string[]} collectionPath The list of collection names.
 * @param {string[]} docPath The list of document names.
 */
export const checkValidDocumentPath = (
  collectionPath: string[],
  docPath: string[]
): void => {
  if (docPath.length !== collectionPath.length)
    throw new Error(
      `The document and collection path must be of the same length.`
    );
};

/**
 * Ensures that the given list of collection and document names will exactly
 * match a Firestore collection path.
 * @param {string[]} collectionPath The list of collection names.
 * @param {string[]} docPath The list of document names.
 */
export const checkValidCollectionPath = (
  collectionPath: string[],
  docPath: string[]
): void => {
  if (docPath.length !== collectionPath.length - 1)
    throw new Error(
      `For a collection path of length ${
        collectionPath.length
      }, the document path must be of length ${collectionPath.length - 1}.`
    );
};
