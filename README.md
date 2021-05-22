# MONARQ

MONARQ sets out to easily allow our users who have an existing GraphQL server accept REST requests from their clients. With a quick install of our NPM Package and invoking two functions, you will have an Express/ GraphQL Server that now accepts REST requests. Here's how it works:

## INSTALLATION

Install MONARQ through the command line

```bash
npm install monarq
```

Now the two main function of the package can be imported into your main Express/GrpahQL server.

```python
import { queryMap, routerCreation } from 'monarq';
```

** USER INPUTS **

MONARQ allows our users to defined the REST Endpoints that they want to open to the public. Simply create a 'Manifest' object in a seperate file and import into your server file. You can also visit MONARQ's website at <<INSERT WEBSITE HERE>> and create your manifest object there.

The manifest object should be in a specific format as follows:

```python
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
- The **Endpoints** Object will have all the **REST API Paths** you want to open to the public with the value of an object. Include as many or as little paths you want to open to the client. That is the beauty of MONARQ; the user can open as many or as little of your GraphQL server to the REST clients!
- Inside each **REST API Paths** object, keys with the label of **GET, POST, PUT, PATCH, DELETE** that correspond with what method you want the client to send the request as.
  -Lastly, inside the **REST API Paths** object, a required field of witht the key 'operation' with a value of a string that corresponds to the Query or Mutation Type Object in your schema.

For the Manifest Object Example above, it is assumed that the user has a method inside their Query or Mutation Type that corresponds to the operation string value. Example schema below:

```python
type Query {
  books(params: QueryParams): Books!
  book(id: ID!): Book
}

type Mutation {
  createBook(book: BookCreateInput!): Book!
  updateBook(id: ID!, book: BookUpdateInput!): Book!
}
```

## USAGE

** Step 1: ** There are two main functions that need to be imported and invoked within your main Express/GraphQL server file.

queryMap takes two inputs: your schema as a GQLSchema and

```

```
