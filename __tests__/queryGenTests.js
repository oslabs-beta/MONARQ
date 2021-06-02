/* eslint-disable no-use-before-define */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const { buildSchema } = require('graphql');
const queryGen = require('../queryMap');

const {
  queryMap,
  generateQuery,
  typeChecker,
  typeTrim,
  grabFields,
  buildString,
  grabArgs,
  argsStrFormatter,
  varStrBuild,
} = queryGen;

const customScalars = ['Date'];
const scalarTypes = [
  'String',
  'Int',
  'ID',
  'Boolean',
  'Float',
  ...customScalars,
];

describe('queryMap function', () => {
  it('generates an object with keys args and queries', () => {
    const result = queryMap(manifest, schema, ['Date']);
    expect(typeof result).toBe('object');
    expect(typeof result.args).toBe('object');
    expect(typeof result.queries).toBe('object');
  });

  it('throws errors if arguments are not the correct data type', () => {
    expect(() => {
      queryMap('test', schema, ['Date']);
    }).toThrow(Error('manifest argument must an object'));
    expect(() => {
      queryMap(manifest, 'test', ['Date']);
    }).toThrow(Error('schema argument must be a GraphQLSchema object'));
    expect(() => {
      queryMap(manifest, schema, 'test');
    }).toThrow(Error('customScalars argument must be an array'));
  });
});

describe('generateQuery function', () => {
  it('handles single scalar arguments', () => {
    expect(generateQuery(schema, 'book', scalarTypes)).toBe(
      'query ( $id: ID!, ) { book ( id:$id, ) { id name author { id name publishers { id name createdAt updatedAt } createdAt updatedAt } createdAt updatedAt } }',
    );
  });

  it('handles multiple scalar arguments', () => {
    expect(generateQuery(schema, 'books', scalarTypes)).toBe(
      'query ( $pageSize: Int!, $page: Int!, ) { books ( pageSize:$pageSize, page:$page, ) { info { count pages next prev } results { id name author { id name publishers { id name createdAt updatedAt } createdAt updatedAt } createdAt updatedAt } } }',
    );
  });

  it('handles arguments of custom types', () => {
    expect(generateQuery(schema, 'updateBook', scalarTypes)).toBe(
      'mutation ( $id: ID!, $name: String, ) { updateBook ( id:$id, book : { name:$name, } ) { id name author { id name publishers { id name createdAt updatedAt } createdAt updatedAt } createdAt updatedAt } }',
    );
  });

  it('throws an error if operation is not defined in schema', () => {
    expect(() => {
      generateQuery(schema, 'test', scalarTypes);
    }).toThrow(Error('Operation \'test\' is not defined in the schema'));
  });
});

describe('grabFields function', () => {
  it('handles types with all scalar fields', () => {
    const recursiveBreak = [];
    const customTypeName = 'BookCreateInput';
    expect(
      grabFields(
        schema,
        customTypeName,
        schema.getType(customTypeName).getFields(),
        recursiveBreak,
        scalarTypes,
      ),
    ).toEqual({
      name: '',
      author: '',
    });
  });

  it('returns a nested object with fields corresponding to scalar or custom type, including self-referenced types', () => {
    const recursiveBreak = [];
    const customTypeName = 'Book';
    expect(
      grabFields(
        schema,
        customTypeName,
        schema.getType(customTypeName).getFields(),
        recursiveBreak,
        scalarTypes,
      ),
    ).toEqual({
      id: '',
      name: '',
      author: {
        id: '',
        name: '',
        publishers: {
          id: '',
          name: '',
          createdAt: '',
          updatedAt: '',
        },
        createdAt: '',
        updatedAt: '',
      },
      createdAt: '',
      updatedAt: '',
    });
  });
});

describe('arguments string formatting', () => {
  it('handles single scalar arguments', () => {
    const argsArr = schema.getQueryType().getFields().book.args;
    expect(
      argsStrFormatter(buildString(grabArgs(schema, argsArr, scalarTypes)[0])),
    ).toBe('id:$id,');
  });

  it('handles multiple scalar arguments', () => {
    const argsArr = schema.getQueryType().getFields().books.args;
    expect(
      argsStrFormatter(buildString(grabArgs(schema, argsArr, scalarTypes)[0])),
    ).toBe('pageSize:$pageSize, page:$page,');
  });

  it('handles arguments of custom types', () => {
    const argsArr = schema.getMutationType().getFields().updateBook.args;
    expect(
      argsStrFormatter(buildString(grabArgs(schema, argsArr, scalarTypes)[0])),
    ).toBe('id:$id, book : { name:$name, }');
  });
});

describe('variables string formatting', () => {
  it('handles single scalar arguments', () => {
    const argsArr = schema.getQueryType().getFields().book.args;
    expect(varStrBuild(grabArgs(schema, argsArr, scalarTypes)[1])).toBe(
      '$id: ID!,',
    );
  });

  it('handles multiple scalar arguments', () => {
    const argsArr = schema.getQueryType().getFields().books.args;
    expect(varStrBuild(grabArgs(schema, argsArr, scalarTypes)[1])).toBe(
      '$pageSize: Int!, $page: Int!,',
    );
  });

  it('handles arguments of custom types', () => {
    const argsArr = schema.getMutationType().getFields().updateBook.args;
    expect(varStrBuild(grabArgs(schema, argsArr, scalarTypes)[1])).toBe(
      '$id: ID!, $name: String,',
    );
  });
});

/* Manifest and Schema inputs */
const manifest = {
  endpoints: {
    '/book/:id': {
      get: {
        operation: 'book',
      },
      post: {
        operation: 'updateBook',
      },
    },
    '/books': {
      post: {
        operation: 'books',
      },
    },
  },
};

const typeDefs = `
scalar Date

type Query {
  # Books
  books(pageSize: Int!, page: Int!): Books!
  book(id: ID!): Book
}

type Mutation {
  # Books
  updateBook(id: ID!, book: BookUpdateInput!): Book!
}

type Book implements Timestamps { 
  id: ID!
  name: String!
  author: Author!
  
  # Interface required
  createdAt: Date!
  updatedAt: Date!
}

type Books {
  info: Info!
  results: [Book]!
}

# Inputs
input BookCreateInput {
  name: String!
  author: ID!
}

input BookUpdateInput {
  name: String
}

type Author implements Timestamps { 
  id: ID!
  name: String!
  publishers: [Publisher]
  
  # Interface required
  createdAt: Date!
  updatedAt: Date!
}

type Publisher implements Timestamps {
  id: ID!
  name: String!
  authors: [Author]
  # Interface required
  createdAt: Date!
  updatedAt: Date!
}

# Interface
interface Timestamps {
createdAt: Date!
updatedAt: Date!
}

# Types
type Info {
count: Int
pages: Int
next: Int
prev: Int
}
`;
const schema = buildSchema(typeDefs);
