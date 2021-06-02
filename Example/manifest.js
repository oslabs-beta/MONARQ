const manifest = {
  endpoints: {
    '/book/:id': {
      get: {
        operation: 'getBook',
      },
    },
    '/books': {
      post: {
        operation: 'createBook',
      },
    },
    '/authors': {
      post: {
        operation: 'createAuthor',
      },
    },
  },
};

module.exports = { manifest };
