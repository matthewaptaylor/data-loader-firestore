/**
 * Ensures that the given list of collection and document names will correctly
 * match a Firestore document.
 * @param {string[]} collectionNames The list of collection names.
 * @param {string[]} docNames The list of document names.
 */
export const checkValidDocumentSegments = (
  collectionNames: string[],
  docNames: string[]
): void => {
  if (docNames.length !== collectionNames.length) {
    const e = new Error(
      `Because there are${collectionNames.length} collection names, there must be ${collectionNames.length} doc names.`
    );
    e.name = "InvalidDocumentNamesError";
    throw e;
  }
};

/**
 * Ensures that the given list of collection and document names will correctly
 * match a Firestore collection.
 * @param {string[]} collectionNames The list of collection names.
 * @param {string[]} docNames The list of document names.
 */
export const checkValidCollectionSegments = (
  collectionNames: string[],
  docNames: string[]
): void => {
  if (docNames.length !== collectionNames.length - 1) {
    const e = new Error(
      `Because there are ${
        collectionNames.length
      } collection names, there must be ${
        collectionNames.length - 1
      } doc names.`
    );
    e.name = "InvalidCollectionNamesError";
    throw e;
  }
};
