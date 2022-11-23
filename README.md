# firestore-data-loader

firestore-data-loader is a utility to reduce requests to Firestore via memoisation.

## Usage

Get the document 'userId' from the users collection:

```ts
import { getFirestore } from "firebase-admin/firestore";
import { FirestoreDataLoader } from "firestore-data-loader";

const firestore = getFirestore();

const users = new FirestoreDataLoader(firestore, "users");
const user = await users.load("userId");
```

Get the document 'postId' from the posts collection of the user 'userId' in the users collection:

```ts
const userPosts = new FirestoreDataLoader(firestore, "users", "posts");
const post = await userPosts.load("userId", "postId");
```

Get all users with the role 'student':

```ts
const users = new FirestoreDataLoader(firestore, "users");
const students = await users.getQuery((usersCollection) =>
  usersCollection.where("role", "==", "student")
);
```

## Planned features

- [x] Data memoisation
- [x] Getting documents by ID
- [ ] Getting documents by query
- [ ] User-defined dataloader support
- [ ] Collection group support
- [ ] Caching support

## Installation

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
