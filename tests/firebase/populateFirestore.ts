import { Firestore } from "@google-cloud/firestore";

/**
 * Description placeholder
 *
 * @param {Firestore} firestore
 * @return {*}
 */
export default async (firestore: Firestore) => {
  // Jane Doe
  const jdoe = firestore.collection("users").doc("jdoe");
  await jdoe.set({
    firstName: "Jane",
    lastName: "Doe",
    role: "student",
  });

  await jdoe.collection("posts").doc("post1").set({
    title: "Post 1",
    content: "This is post 1",
  });

  // John Doe
  await firestore.collection("users").doc("johndoe").set({
    firstName: "John",
    lastName: "Doe",
  });

  // John Smith
  await firestore.collection("users").doc("jsmith").set({
    firstName: "John",
    lastName: "Smith",
    role: "student",
  });
};
