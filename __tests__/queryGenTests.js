import schema from '../graphql/schema';
import { manifest } from '../monarq/dummyManifestAndQueryObj.js';
import { queryObject, generateQuery, typeTrim, grabFields, buildString, grabArgs, argsStrFormatter, varStrBuild } from '../monarq/wip.js';

describe('typeTrim function', () => {
  it('removes ! and [] from a type string', () => {
    expect(typeTrim('[book]')).toBe('book');

    expect(typeTrim('[book!]')).toBe('book');

    expect(typeTrim('book!')).toBe('book');
  });
});

describe('grabFields function', () => {
  it('handles types with all scalar fields', () => {
    const recursiveBreak = [];
    const customTypeName = 'BookCreateInput'
    expect(grabFields(schema, customTypeName, schema.getType(customTypeName).getFields(), recursiveBreak)).toEqual({
      name: '',
      author: ''
    });
  });

  it('returns a nested object for types which contain fields of custom type', () => {

  });

  it('returns a nested object with all fields corresponding to a self-referenced type', () => {
    const recursiveBreak = [];
    const customTypeName = 'Book';
    expect(grabFields(schema, customTypeName, schema.getType(customTypeName).getFields(), recursiveBreak)).toEqual({
      id: '',
      name: '',
      author: {
        id: '',
        name: '',
        publishers: {
          id: '',
          name: '',
          createdAt: '',
          updatedAt: ''
        },
        createdAt: '',
        updatedAt: ''
      }, 
      createdAt: '',
      updatedAt: ''
    })
  });


})

describe('arguments string formatting', () => {
  it('handles single scalar arguments', () => {
    const argsArr = schema.getQueryType().getFields().book.args;
    expect(argsStrFormatter(buildString(grabArgs(schema, argsArr)[0]))).toBe('(id: $id)');
  });

  it('handles multiple scalar arguments', () => {

  });

  it('handles arguments of custom types', () => {

  });
})


describe('variables string formatting', () => {
  it('handles single scalar arguments', () => {

  });

  it('handles multiple scalar arguments', () => {

  });

  it('handles arguments of custom types', () => {

  });
})