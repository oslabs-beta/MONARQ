/* Instructions */
// Copy the this index.js file and the manifest.js file from the Example folder into a new directory on your machine
// Within that directory, run: npm i express graphql @graphql-tools/schema monarq
// Then run: node index
// Follow the instructions starting on line 117 to run example REST requests

/* This first section is set up for a basic GraphQL server - nothing specific to monarq just yet */
const express = require('express');
const { graphql } = require('graphql');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { routerCreation, queryMap } = require('monarq');
const { manifest } = require('./manifest.js');

const app = express();
app.use(express.json());

// Example GraphQL Schema
const typeDefs = `
type Query {
  getBook(id: ID!): Book
}

type Mutation {
  createAuthor(name: String!): Author!
  createBook(name: String!, author: ID!): Book!
}

type Book { 
  id: ID!
  name: String!
  author: Author!
}

type Author { 
  id: ID!
  name: String!
}
`

const resolvers = {
  Query: {
    getBook: (_, {id}) => {
      return {
          id,
          name: 'A Good Book',
          author: {
            id: 45,
            name: 'Alex M.'
          }
      }
    }
  },
  Mutation: {
    createBook: (_, { name, author }) => {
        return {
            id: 101,
            name,
            author: {
              id: 45,
              name: author
            }
        }
    },
    createAuthor: (_, { name }) => {
      return {
          id: 50,
          name
      }
    }
  }
};

// A schema of type GraphQLSchema object is required to use monarq (either buildSchema from the graphql module or makeExecutableSchema from the @graphql-tools/schema module can be used to generate the schema object)
const schema = makeExecutableSchema({typeDefs, resolvers});


/* This next section contains the code that you will need to implement from monarq in order to handle REST requests */

// STEP 1
// Invoke the queryMap function installing monarq
const createdQuery = queryMap(manifest, schema);
// The console log below purely informational, showing the object that is returned from queryMap
console.log('queryMap Object', createdQuery);

// STEP 2
// You will need to define this executeFunction, which has four parameters, and will be used by the monarq middleware to execute the GraphQL query
// executeFn is a wrapper that should be placed around whatever method you are currently using to execute GraphQL queries. In this example, the native graphql method from graphql.js is used.
async function executeFn ({ query, variables, schema, context }){

  const data = await graphql(
    schema, 
    query,
    null,
    context,
    variables
  );

  return (data || errors);
}

// STEP 3
// Invoke the routerCreation function to create a new express router that will handle all REST requests
const context = {};
const apiRouter = routerCreation(manifest, createdQuery, {
  context,
  schema, 
  executeFn 
});

// STEP 4
// Implement the apiRouter in your server so that all REST requests are directed here
app.use('/api', apiRouter)

app.listen(4000);


/* To see monarq in action, try each of the following HTTP requests using curl */
// curl -X GET http://localhost:4000/api/book/100 -H 'content-type: application/json' // expected response-> {"data":{"getBook":{"id":"100","name":"A Good Book","author":{"id":"45","name":"Alex M."}}}}
// curl -X POST http://localhost:4000/api/authors -H 'content-type: application/json' -d '{ "name": "Taylor A." }' // expected response-> {"data":{"createAuthor":{"id":"50","name":"Taylor A."}}}
// curl -X POST http://localhost:4000/api/books -H 'content-type: application/json' -d '{ "name": "Cool Book", "author": "45" }' // expected response-> {"data":{"createBook":{"id":"101","name":"Cool Book","author":{"id":"45","name":"45"}}}}

/* The requests below demonstrate error messaging for when the user fails to provide necessary arguments with the query. It is recommended to clearly explain all necessary arguments for each REST endpoint in documentation that you provide REST users */
// curl -X POST http://localhost:4000/api/authors -H 'content-type: application/json' // expected response-> "Issue Executing Request: Variable \"$name\" of required type \"String!\" was not provided."
// curl -X POST http://localhost:4000/api/books -H 'content-type: application/json' -d '{ "name": "Cool Book" }' // expected response-> "Issue Executing Request: Variable \"$author\" of required type \"ID!\" was not provided."


