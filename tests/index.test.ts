import { describe, expect, test } from "@jest/globals";
import { sum } from "../src/index";
import firestore from "./firebase/makeDbConnection";

describe("sum module", () => {
  test("adds 1 + 2 to equal 3", async () => {
    const data = await firestore.collection("users").doc("jdoe").set({
      firstName: "Jane",
      lastName: "Doe",
    });

    console.log("users/jdoe successfully written at", data.writeTime);

    expect(sum(1, 2)).toBe(3);
  });
});
