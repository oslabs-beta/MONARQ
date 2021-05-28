// copy the this index.js file and the manifest.js file from the Example folder into a new directory
// within that directory, run: npm i graphql express body-parser monarq
// then run: npm index


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

// create a GraphQL Schema using either makeExecutableSchema or buildSchema
const schema = makeExecutableSchema({typeDefs, resolvers});

// STEP 1
const createdQuery = queryMap(manifest, schema);
// Console log below to show what the object returned from queryMap looks like
console.log('queryMap Object', createdQuery);

//STEP 2
//will need to have user define this executeFunction cause the middleware will execute the graphql query with these 4 arguments passed in
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
const context = {};
const apiRouter = routerCreation(manifest, createdQuery, {
  context,
  schema, 
  executeFn //takes an object with 4 keys: query, variables, schema, context
});

// STEP 4
app.use('/api', apiRouter)

app.listen(4000);

/* 
curl -X GET http://localhost:4000/api/book/100 -H 'content-type: application/json'
curl -X POST http://localhost:4000/api/authors -H 'content-type: application/json' -d '{ "name": "Author1" }'
curl -X POST http://localhost:4000/api/books -H 'content-type: application/json' -d '{ "name": "Cool Book", "author": "Alex M." }'
*/

