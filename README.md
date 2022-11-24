# data-loader-firestore

data-loader-firestore is a utility to reduce requests to Firestore via memoisation.

## Usage

To add data-loaer-firestore to your project:

```bash
npm install --save data-loader-firestore
```

Get the document 'userId' from the users collection:

```ts
import { getFirestore, DocumentData } from "firebase-admin/firestore";
import { FirestoreDataLoader } from "data-loader-firestore";

const firestore = getFirestore();

interface User extends DocumentData {
  name: string;
  role: string;
}

const users = new FirestoreDataLoader<User>(firestore, "users");

// Returns { _id: 'userId', _path: '/users/userId', name: "Jane", role: "student" }
const user = await users.fetchDocById("userId");
```

Get the document 'postId' from the posts collection of the user 'userId' in the users collection:

```ts
interface UserPost extends DocumentData {
  title: string;
}

const userPosts = new FirestoreDataLoader<UserPost>(
  firestore,
  "users",
  "posts"
);

// Returns { _id: 'postId', _path: '/users/userId/posts/postId', title: "My first post" }
const post = await userPosts.fetchDocById("userId", "postId");
```

Get all users with the role 'student':

```ts
// Returns [
//  { _id: 'userId', _path: '/users/userId', name: "Jane", role: "student" },
//  { _id: 'userId4', _path: '/users/userId2', name: "John", role: "student" }
// ]
const students = await users.fetchDocsByQuery((usersCollection) =>
  usersCollection.where("role", "==", "student")
);
```

Create a user with the document ID 'msmith':

```ts
// Returns { _id: 'msmith', _path: '/users/msmith', name: "Mary Smith", role: "student" }
const students = await users.createDoc(
  {
    name: "Mary Smith",
    role: "teacher",
  },
  "msmith"
);
```

Create a user with a generated document ID:

```ts
// Returns { _id: 'generatedId', _path: '/users/generatedId', name: "Mary Smith", role: "student" }
const students = await users.createDoc({
  name: "Mary Smith",
  role: "teacher",
});
```

## Planned features

- [x] Data memoisation
- [x] Getting documents by ID
- [x] Getting documents by query
- [ ] Creating documents
- [ ] Choice to disable memoisation for specific calls
- [ ] User-defined dataloader support
- [ ] Collection group support
- [ ] Clearing a memoised document
- [ ] Caching support

## Installation

If you'd like to contribute to this project, you can install the dependencies with:

```bash
npm install
npm install -g firebase-tools
firebase login
```

Set up your code editor to use the ESLint and Prettier on save.

## Testing

Tests are run automatically on pre-commit via Husky. You can also run them manually with:

```bash
firebase emulators:start --only firestore
npm run test
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](LICENSE)
