# MONARQ

**MONARQ** makes it easy to accept REST requests with an existing Express/GraphQL server. Expand your application's API compatability with just a few lines of code.  


## Contents
[_Installation_](#installation)  
[_How It Works_](#how-it-works)  
[_Required User Inputs_](#required-user-inputs)  
[_Getting Started_](#getting-started)  
[_Keep in Mind_](#keep-in-mind)  
  


# Installation

Install **MONARQ** through the command line

```bash
npm install monarq
```

Now the two core functions of the package can be imported into your main Express/GraphQL server.

```javascript
import { queryMap, routerCreation } from 'monarq';
```

# How It Works

There are two functions that need to be invoked within your main Express/GraphQL server file.

### Step 1:
`queryMap` generates an object containing GraphQL queries/mutations and arguments for each operation specified in the [Manifest Object](#required-user-inputs). This 'map' of queries will be used to match REST requests to corresponding GQL operations. `queryMap` takes up to three arguments:

- [Manifest Object](#required-user-inputs)
- Schema of type GQLSchema object
- (_Optional_) Array containing any custom scalar types declared in your schema 

Invoke this function in your main Express/GraphQL server file and assign the result to a constant.  

_Examples_

If no custom scalar types are used:
```javascript
const createdQuery = queryMap(manifest, schema);
```
OR

If a custom scalar type of 'Date' is defined in the schema:
```javascript
const createdQuery = queryMap(manifest, schema, ['Date']); 
```

### Step 2:
`routerCreation` returns an express.Router instance containing route handlers for each of the API Paths defined within the [Manifest Object](#required-user-inputs).  `routerCreation` takes three arguments:

- [Manifest Object](#required-user-inputs)
- `createdQuery` (the saved value from invoking the queryMap function)
- An Object with three keys: schema, context, and your created [`executeFn`](#required-user-inputs)  

_Example_

```javascript
const routes = routerCreation(manifest, createdQuery, {
  schema,
  context,
  executeFn,
});
```

### Step 3: 
Implement the newly created router with `app.use` in your server file. All REST requests should be directed to the same top-level path (e.g., '/rest') so that the `routes` middleware will be applied.  

_Example_

```javascript
app.use('/rest', routes);
```

That's it! Your application is now ready to accept both GraphQL and REST requests.

# Required User Inputs

Before implementing `queryMap` and `routerCreation`, you will have to define the REST endpoints that you want to expose. Each REST endpoint will be mapped to a GraphQL operation, thus allowing the client to send REST requests and you to handle those requests with your GraphQL server. **MONARQ** gives you the flexibility to define as many or as few REST endpoints as you want to expose.     

Create a manifest object in a file and import into your server file. You can also visit **MONARQ**'s [website](link_for_website) to create the manifest object using a simple visual interface.

### 1) DEFINE MANIFEST OBJECT    

The Manifest Object must be in a specific format as shown in the following example:

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
            get: {
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

This Manifest Object is a required input into both `queryMap` and `routerCreation`. Each manifest object will contain:  

- A key called **endpoints**, with value object
- The **endpoints** object will have all the **REST API Paths** you want to expose as the keys with the value of an object
  - Remember to have clients pre-pend these paths with whatever top-level path was defined in your route handler when making requests (e.g., '/rest/books') 
- Inside each **REST API Path** object, the keys will have one of these five labels: **GET, POST, PUT, PATCH, DELETE**. These methods correspond with the HTTP method that you want the client to send the request as.
- Inside each **HTTP method** object, a required key `operation` will have the value of a string that corresponds to the GraphQL Query or Mutation operation name that should be invoked when the REST endpoint is requested. Note: the operation must be present within the GraphQL schema.
  - _Optional_: if the `operation` requires arguments and default parameters have been defined, you must specify these within an object at key **defaultParams**, also within the **HTTP method** object   

_Excerpt of an example schema corresponding to the the manifest object above:_  

```graphql
type Query {
  books(pageSize: Int!, page: Int!): Books!
  book(id: ID!): Book
}

type Mutation {
  updateBook(id: ID!, book: BookUpdateInput!): Book!
}
```

  

### 2) DEFINE EXECUTE FUNCTION  

One of the required arguments for `routerCreation` is a standardized form of the method that your server uses to execute GraphQL queries. Create a wrapper function labeled `executeFn` that accepts one argument, an object, with four keys: query, context, schema, and variables. Have the wrapper function return the response from the GraphQL server.  

_Example_

In this case, the native graphql method from graphql.js is used to execute queries.  

```javascript
async const executeFn = ({ query, variables, schema, context }) => {
    return await graphql(
        schema,
        query,
        null,
        context,
        variables
    );
};
```

### 3) IMPORT  

Lastly, make sure the main Express/GraphQL server file has your GQL schema and context imported in.


# Getting Started  

Check out the Example folder within the MONARQ repository to see a simple implementation of the package.  
# Keep in Mind

**+** If default parameters exist in the resolvers, make sure to add the key `defaultParams` with the value of an object with the keys as the variable names and the value of the default value the resolver uses. See the above example [Manifest Object](#required-user-inputs) for more details.

**+** GraphQL Subscription Type is not supported at this time.

**+** MONARQ currently supports the 5 main HTTP REST Methods (Get, Post, Put, Patch, Delete). Any other method passed in will throw an error.

# Contributors

[Peter Baniuszewicz](https://www.linkedin.com/in/peterbaniuszewicz/) [@Peter-Ba](https://github.com/Peter-Ba)

[Amy Chen](https://www.linkedin.com/in/amyechen) [@designal46](https://github.com/designal46)

[Tyler Kneidl](https://www.linkedin.com/in/tylerkneidl/) [@tylerkneidl](https://github.com/tylerkneidl)

[Helen Regula](https://www.linkedin.com/in/helen-regula/) [@helenregula](https://github.com/helenregula)
