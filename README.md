# MONARQ

**MONARQ** sets out to easily allow our users who have an existing Express/GraphQL server accept REST requests from their clients. With a quick install of our NPM Package and invoking two functions, you will have an Express/ GraphQL Server that now accepts REST requests. Here's how it works:

## Installation

Install **MONARQ** through the command line

```bash
npm install monarq
```

Now the two main function of the package can be imported into your main Express/GraphQL server.

```javascript
import { queryMap, routerCreation } from "monarq";
```

## How To Use

There are two main functions that need to be invoked within your main Express/GraphQL server file.

**Step 1:** `queryMap` is a function that will take a manifest object [see below](##required-user-inputs) and schema and return an object with created query/ mutation strings. `queryMap` takes two inputs:

- A [Manifest Object](##required-user-inputs)
- User's schema as a GQLSchema.

Invoke this function in your main Express/GraphQL server file and save the result as a variable.

Example:

```javascript
const queryMapObj = queryMap(manifest, schema);
```

**Step 2:** `routerCreation` is a function that takes three arguments:

- [Manifest Object](##required-user-inputs),
- `queryMapObj`:(the saved value from invoking the queryMap function)
- An Object with three keys: schema, context, and your created [`executeFn`](##required-user-inputs). This will return an express.Router instance that will have the API Paths inside the manifest object as it's routes!

Example:

```javascript
const routes = routerCreation(manifest, queryMapObj, {
  schema,
  context,
  executeFn,
});
```

**Step 3:** `app.use`

Now use Express's `app.use` with the first argument as the first endpoint that each client's REST Request will use, and the returned result of invoking `routerCreation`.

Example:

```javascript
app.use("/rest", routes);
```

That's it!

## Required User Inputs

**MONARQ** allows our users to define the REST Endpoints that they want to open to the public. Simply create a 'Manifest' object in a seperate file and import into your server file. You can also visit **MONARQ**'s website at [insert website here]() and easily create the manifest object there.

**STEP 1: DEFINE MANIFEST OBJECT**
The Manifest Object should be in a specific format as follows:

```javascript
const manifest = {
    endpoints:{
        '/book/:id': {
            get: {
                operation: 'book'
            },
            post {
                operation: 'updateBook'
            }
        },
        '/books': {
            get : {
                operation: 'books'
            },
            post: {
                operation: 'books'
                defaultParams: {
                    pageSize: 20,
                    page: 1
                }
            }
        }
    }

}
```

This Manifest Object is a required input into both functions. Each manifest object will contain:

- One Object with the key **Endpoints**
- The **Endpoints** Object will have all the **REST API Paths** you want to open to the public as the keys with the value of an object. Include as many or as little paths you want to open to the client. That is the beauty of **MONARQ**; the user can open as many or as little of your GraphQL server to the REST clients!
- Inside each **REST API Paths** object, the keys will have one of these five labels: **GET, POST, PUT, PATCH, DELETE**. These methods correspond with what method you want the client to send the request as.
- Lastly, inside the **REST API Paths** object, a required field `operation` will have the value of a string that corresponds to the Query or Mutation Type Object in the user's schema.

For the Manifest Object Example above, it is assumed that the user has a method inside their Query or Mutation Type that corresponds to the operation string value.

Example schema below:

```graphql
type Query {
  books(params: QueryParams): Books!
  book(id: ID!): Book
}

type Mutation {
  createBook(book: BookCreateInput!): Book!
  updateBook(id: ID!, book: BookUpdateInput!): Book!
}
```

As you can see the string 'book' inside the Manifest Object coincides with the method 'book' inside the Query Type Object and so on...

**STEP 2: DEFINE EXECUTE FUNCTION**

A required input into the second function, `routerCreation`, will be the function that queries the user's GraphQL Server. Create a wrapper function labeled `executeFn` that accepts one argument, an object, with four keys: query, context, schema, and variables. Have the wrapper function return the response from the GraphQL server.

Example:

```javascript
async const executeFn = ({ query, variables, schema, context }) => {
    return await graphql(
        schema,
        query,
        null,
        context,
        variables
    )
}
```

**STEP 3: IMPORT**

Lastly, make sure the main Express/GraphQL server file has schema and context imported in and now you are set to invoke the functions!

# Keep in Mind

**1.** The function does not take into account any default parameters that your resolvers may use. If default parameters exist in your resolver, make sure to add the key `defaultParams` with the value of an object with the keys as the variable names and the value of the default value the resolver uses.

**2.** We do not support GraphQL Subscription Types at this time.

**3.** We only support the main 5 HTTP REST Methods: Get, Post, Put, Patch, Delete. Any other method passed in will throw an error.

# Contributors

[Peter Baniuszewicz]() [@Peter-Ba](https://github.com/Peter-Ba)

[Amy Chen]() [@designal46](https://github.com/designal46)

[Tyler Kneidl]() [@tylerkneidl](https://github.com/tylerkneidl)

[Helen Regula]() [@helenregula](https://github.com/helenregula)
