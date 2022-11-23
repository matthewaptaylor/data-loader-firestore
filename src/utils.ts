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
      "The number of collection names must match the number of doc names."
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
      "The number of collection names must be one more than the number of document names."
    );
    e.name = "InvalidCollectionNamesError";
    throw e;
  }
};
