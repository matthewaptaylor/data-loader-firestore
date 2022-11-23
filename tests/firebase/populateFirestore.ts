import { Firestore } from "@google-cloud/firestore";

/**
 * Description placeholder
 *
 * @param {Firestore} firestore
 * @return {*}
 */
export default async (firestore: Firestore) => {
  const jdoe = firestore.collection("users").doc("jdoe");
  await jdoe.set({
    firstName: "Jane",
    lastName: "Doe",
  });

  await jdoe.collection("posts").doc("post1").set({
    title: "Post 1",
    content: "This is post 1",
  });
};
