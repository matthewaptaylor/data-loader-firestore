import { describe, expect, test } from "@jest/globals";
import { FirestoreCollectionLoader } from "../src";
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
      _id: "jdoe",
      _path: "users/jdoe",
      firstName: "Jane",
      lastName: "Doe",
      role: "student",
    });
  });

  test("returns undefined on non-existent document", async () => {
    await firestoreIsPopulated;

    const users = new FirestoreCollectionLoader(firestore, "users");

    expect(await users.fetchDocById("yeet")).toBe(undefined);
  });

  test("rejects too few document names", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    expect(async () => await userPosts.fetchDocById("jdoe")).rejects.toThrow(
      "To select a document, the number of document names must match the number of collection names."
    );
  });

  test("rejects too many document names", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    expect(
      async () => await userPosts.fetchDocById("jdoe", "post1", "likes")
    ).rejects.toThrow(
      "To select a document, the number of document names must match the number of collection names."
    );
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
      _id: "post1",
      _path: "users/jdoe/posts/post1",
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
      _id: "changingjoe",
      _path: "users/changingjoe",
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
        _id: "jdoe",
        _path: "users/jdoe",
        firstName: "Jane",
        lastName: "Doe",
        role: "student",
      },
      {
        _id: "jsmith",
        _path: "users/jsmith",
        firstName: "John",
        lastName: "Smith",
        role: "student",
      },
    ]);
  });

  test("rejects too few document names", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    expect(
      async () =>
        await userPosts.fetchDocsByQuery((c) =>
          c.where("title", "==", "Post 1")
        )
    ).rejects.toThrow(
      "To select a collection, the number of document names must be one less than the number of collection names."
    );
  });

  test("rejects too many document names", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    expect(
      async () =>
        await userPosts.fetchDocsByQuery(
          (c) => c.where("title", "==", "Post 1"),
          "jdoe",
          "post1"
        )
    ).rejects.toThrow(
      "To select a collection, the number of document names must be one less than the number of collection names."
    );
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
        _id: "post1",
        _path: "users/jdoe/posts/post1",
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
      _id: "changingjoe",
      _path: "users/changingjoe",
      firstName: "Same",
      lastName: "Joe",
    });
  });
});

describe("FirestoreCollectionLoader.createDoc", () => {
  test("rejects invalid doc names", () => {
    const users = new FirestoreCollectionLoader(firestore, "users");

    expect(
      async () =>
        await users.createDoc(
          {
            firstName: "Jane",
            lastName: "Doe",
          },
          true,
          "j/johndoe"
        )
    ).rejects.toThrow("Document names cannot contain slashes.");
  });

  test("rejects too few document names", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    expect(
      async () =>
        await userPosts.createDoc(
          {
            title: "Invalid Post",
            content: "This is an invalid post",
          },
          true
        )
    ).rejects.toThrow(
      "To select a collection, the number of document names must be one less than the number of collection names."
    );
  });

  test("rejects too many document names", () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    expect(
      async () =>
        await userPosts.createDoc(
          {
            title: "Another Invalid Post",
            content: "This is another invalid post",
          },
          true,
          "jdoe",
          "post1",
          "likes"
        )
    ).rejects.toThrow(
      "To select a collection, the number of document names must be one less than the number of collection names."
    );
  });

  test("creates document with id", async () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    await userPosts.createDoc(
      {
        _id: "post2",
        _path: "users/jdoe/posts/post2",
        title: "Second Post",
        content: "This is a second post",
      },
      true,
      "jdoe",
      "post2"
    );

    const userPost = (
      await firestore
        .collection("users")
        .doc("jdoe")
        .collection("posts")
        .doc("post2")
        .get()
    ).data();

    expect(userPost).toEqual({
      title: "Second Post",
      content: "This is a second post",
    });
  });

  test("creates document with id", async () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    await userPosts.createDoc(
      {
        title: "Second Post",
        content: "This is a second post",
      },
      true,
      "jdoe",
      "post2"
    );

    const post2 = await firestore
      .collection("users")
      .doc("jdoe")
      .collection("posts")
      .doc("post2")
      .get();

    expect(post2.data()).toEqual({
      title: "Second Post",
      content: "This is a second post",
    });
  });

  test("creates document with generated id", async () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    const userPost = await userPosts.createDoc(
      {
        title: "Random Post",
        content: "This is a random post",
      },
      true,
      "jdoe"
    );

    const post2 = await firestore
      .collection("users")
      .doc("jdoe")
      .collection("posts")
      .doc(userPost?._path?.split("/")[3] ?? "")
      .get();

    expect(post2.data()).toEqual({
      title: "Random Post",
      content: "This is a random post",
    });
  });

  test("memoises document when created with id", async () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    await userPosts.createDoc(
      {
        title: "Memoed Post",
        content: "This is a memoed post",
      },
      true,
      "jdoe",
      "postMemo"
    );

    await firestore
      .collection("users")
      .doc("jdoe")
      .collection("posts")
      .doc("postMemo")
      .set({
        title: "Changed Post",
        content: "This is a memoed post that's been changed",
      });

    const data = await userPosts.fetchDocById("jdoe", "postMemo");

    expect(data).toEqual({
      _id: "postMemo",
      _path: "users/jdoe/posts/postMemo",
      title: "Memoed Post",
      content: "This is a memoed post",
    });
  });

  test("memoises document when created with generated id", async () => {
    const userPosts = new FirestoreCollectionLoader(
      firestore,
      "users",
      "posts"
    );

    const createRes = await userPosts.createDoc(
      {
        title: "Memoed Post",
        content: "This is a memoed post",
      },
      true,
      "jdoe",
      "postMemo"
    );

    await firestore
      .collection("users")
      .doc("jdoe")
      .collection("posts")
      .doc(createRes?._path?.split("/")[3] ?? "")
      .set({
        title: "Changed Post",
        content: "This is a memoed post that's been changed",
      });

    const data = await userPosts.fetchDocById("jdoe", "postMemo");

    expect(data).toEqual({
      _id: "postMemo",
      _path: createRes?._path,
      title: "Memoed Post",
      content: "This is a memoed post",
    });
  });
});
