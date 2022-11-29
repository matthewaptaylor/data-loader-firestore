# data-loader-firestore

data-loader-firestore is a utility to reduce requests to Firestore via memoisation. This means requests to Firestore for the same document aren't duplicated, as long as they are carried out on the same instance of FirestoreDataLoader. Among other use cases, it can be very useful in a GraphQL server ([explained here](https://www.apollographql.com/docs/apollo-server/data/fetching-data#batching-and-caching)), such as Apollo Server v4.

## Usage

To add data-loader-firestore to your project:

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

Get all users:

```ts
// Returns [
//  { _id: 'userId', _path: '/users/userId', name: "Jane", role: "student" },
//  { _id: 'userId1', _path: '/users/userId1', name: "Jack", role: "teacher" }
//  { _id: 'userId2', _path: '/users/userId2', name: "John", role: "student" }
// ]
const students = await users.fetchDocs();
```

Get all users with the role 'student':

```ts
// Returns [
//  { _id: 'userId', _path: '/users/userId', name: "Jane", role: "student" },
//  { _id: 'userId2', _path: '/users/userId2', name: "John", role: "student" }
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
  true,
  "msmith"
);
```

To update the role of the document 'msmith':

```ts
// Returns { _id: 'msmith', _path: '/users/msmith', name: "Mary Smith", role: "retured" }
const students = await users.createDoc(
  {
    role: "retired",
  },
  false,
  "msmith"
);
```

Create a user with a generated document ID:

```ts
// Returns { _id: 'generatedId', _path: '/users/generatedId', name: "Mary Smith", role: "student" }
const students = await users.createDoc(
  {
    name: "Mary Smith",
    role: "teacher",
  },
  true
);
```

## Planned features

- [x] Data memoisation
- [x] Getting documents by ID
- [x] Getting documents by query
- [x] Creating documents
- [ ] Choice to disable memoisation for specific calls
- [ ] User-defined dataloader support
- [x] Collection group support
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
