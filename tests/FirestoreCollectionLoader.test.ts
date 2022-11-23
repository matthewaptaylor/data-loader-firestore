import { describe, expect, test } from "@jest/globals";
import FirestoreCollectionLoader from "../src/FirestoreCollectionLoader";
import firestore from "./firebase/makeDbConnection";
import populateFirestore from "./firebase/populateFirestore";

const firestoreIsPopulated = populateFirestore(firestore);

describe("FirestoreCollectionLoader.constructor", () => {
  test("rejects nonexistent collection names", () => {
    expect(() => new FirestoreCollectionLoader(firestore)).toThrow(
      "Collection names must be specified."
    );
  });

  test("rejects invalid collection names", () => {
    expect(
      () => new FirestoreCollectionLoader(firestore, "people/users")
    ).toThrow("Collection names cannot contain slashes.");
  });
});

describe("FirestoreCollectionLoader.getCollectionRef", () => {
  test("calculates segments with no documents", () => {
    const users = new FirestoreCollectionLoader(firestore, "users");
    const usersRef = users["getCollectionRef"]();

    expect(usersRef.path).toEqual("users");
  });

  test("calculates segments with one document", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );
    const postsRef = userPosts["getCollectionRef"]("jdoe");

    expect(postsRef.path).toEqual("users/jdoe/posts");
  });
});

describe("FirestoreCollectionLoader.getDocRef", () => {
  test("retreives reference one document deep", () => {
    const users = new FirestoreCollectionLoader(firestore, "users");
    const userRef = users["getDocRef"]("jdoe");

    expect(userRef.path).toEqual("users/jdoe");
  });

  test("retreives reference two documents deep", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );
    const postRef = userPosts["getDocRef"]("jdoe", "post1");

    expect(postRef.path).toEqual("users/jdoe/posts/post1");
  });
});

describe("FirestoreCollectionLoader.getCollectionSegments", () => {
  test("calculates segments with no documents", () => {
    const users = new FirestoreCollectionLoader(firestore, "users");
    const usersPath = users["getCollectionSegments"]();

    expect(usersPath).toEqual(["users"]);
  });

  test("calculates segments with one document", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );
    const postsPath = userPosts["getCollectionSegments"]("jdoe");

    expect(postsPath).toEqual(["users", "jdoe", "posts"]);
  });
});

describe("FirestoreCollectionLoader.getDocSegments", () => {
  test("calculates segments with one document", () => {
    const users = new FirestoreCollectionLoader(firestore, "users");
    const userPath = users["getDocSegments"]("jdoe");

    expect(userPath).toEqual(["users", "jdoe"]);
  });

  test("calculates segments with two documents", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );
    const postPath = userPosts["getDocSegments"]("jdoe", "post1");

    expect(postPath).toEqual(["users", "jdoe", "posts", "post1"]);
  });
});

describe("FirestoreCollectionLoader.getDocNamesFromSegments", () => {
  test("calculates doc name with two segments", () => {
    const users = new FirestoreCollectionLoader(firestore, "users");
    const userDocNames = users["getDocNamesFromSegments"]("users", "jdoe");

    expect(userDocNames).toEqual(["jdoe"]);
  });

  test("calculates doc name with four segments", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );
    const postDocNames = userPosts["getDocNamesFromSegments"](
      "users",
      "jdoe",
      "posts",
      "post1"
    );

    expect(postDocNames).toEqual(["jdoe", "post1"]);
  });
});

describe("FirestoreCollectionLoader.fetchDocById", () => {
  test("rejects nonexistent doc names", () => {
    const users = new FirestoreCollectionLoader(firestore, "users");

    expect(async () => await users.fetchDocById()).rejects.toThrow(
      "Document names must be specified."
    );
  });

  test("rejects invalid doc names", () => {
    const users = new FirestoreCollectionLoader(firestore, "users");

    expect(async () => await users.fetchDocById("jdoe/posts")).rejects.toThrow(
      "Document names cannot contain slashes."
    );
  });

  test("gets document", async () => {
    await firestoreIsPopulated;

    const users = new FirestoreCollectionLoader(firestore, "users");
    const userPath = await users.fetchDocById("jdoe");

    expect(userPath).toEqual({
      firstName: "Jane",
      lastName: "Doe",
      role: "student",
    });
  });

  test("gets document two in", async () => {
    await firestoreIsPopulated;

    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );
    const post = await userPosts.fetchDocById("jdoe", "post1");

    expect(post).toEqual({
      title: "Post 1",
      content: "This is post 1",
    });
  });

  test("does not re-request document", async () => {
    await firestoreIsPopulated;

    await firestore.collection("users").doc("changingjoe").set({
      firstName: "Same",
      lastName: "Joe",
    });

    const users = new FirestoreCollectionLoader(firestore, "users");
    await users.fetchDocById("changingjoe");

    await firestore.collection("users").doc("changingjoe").set({
      firstName: "Changed",
      lastName: "Joe",
    });
    const user = await users.fetchDocById("changingjoe");

    expect(user).toEqual({
      firstName: "Same",
      lastName: "Joe",
    });
  });
});

describe("FirestoreCollectionLoader.fetchDocsByQuery", () => {
  test("rejects invalid doc names", () => {
    const users = new FirestoreCollectionLoader(firestore, "users");

    expect(
      async () => await users.fetchDocsByQuery((c) => c, "jdoe/posts")
    ).rejects.toThrow("Document names cannot contain slashes.");
  });

  test("gets document", async () => {
    await firestoreIsPopulated;

    const users = new FirestoreCollectionLoader(firestore, "users");
    const userRes = await users.fetchDocsByQuery((c) =>
      c.where("role", "==", "student")
    );

    expect(userRes).toEqual([
      {
        firstName: "Jane",
        lastName: "Doe",
        role: "student",
      },
      {
        firstName: "John",
        lastName: "Smith",
        role: "student",
      },
    ]);
  });

  test("gets document two in", async () => {
    await firestoreIsPopulated;

    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    const userRes = await userPosts.fetchDocsByQuery(
      (c) => c.where("title", "==", "Post 1"),
      "jdoe"
    );

    expect(userRes).toEqual([
      {
        title: "Post 1",
        content: "This is post 1",
      },
    ]);
  });

  test("does not re-request document", async () => {
    await firestoreIsPopulated;

    await firestore.collection("users").doc("changingjoe").set({
      firstName: "Same",
      lastName: "Joe",
    });

    const users = new FirestoreCollectionLoader(firestore, "users");
    await users.fetchDocsByQuery((c) => c.where("firstName", "==", "Same"));

    await firestore.collection("users").doc("changingjoe").set({
      firstName: "Changed",
      lastName: "Joe",
    });
    const userPath = await users.fetchDocById("changingjoe");

    expect(userPath).toEqual({
      firstName: "Same",
      lastName: "Joe",
    });
  });
});
