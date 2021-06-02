/* eslint-disable no-console */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const express = require('express');
const request = require('supertest');

const routerCreation = require('../routerCreation');

const app = express();

describe('routerCreation Function Test', () => {
  const manifest = {
    endpoints: {
      '/working': {
        get: {
          operation: 'yes',
        },
      },
    },
  };

  const queryMap = {
    args: {
      yes: { yes: 'This is the args' },
    },
    queries: {
      yes: 'This is the query',
    },
  };

  const executeFn = ({
    query, variables, schema, context,
  }) => ({
    success: 'Test successful',
  });

  const badExecuteFn = ({
    query, variables, schema, context,
  }) => ({
    errors: 'Test Failed',
  });
  const returned = routerCreation(manifest, queryMap, {
    schema: 'This is Schema',
    context: {
      info: 'This is Context',
    },
    executeFn,
  });

  const badReturned = routerCreation(manifest, queryMap, {
    schema: 'This is Schema',
    context: {
      info: 'This is Context',
    },
    executeFn: badExecuteFn,
  });

  it('should return an express router function', () => {
    expect(typeof returned).toEqual('function');
  });

  it('should have a stack with one element in it', () => {
    expect(returned.stack.length).toEqual(1);
  });

  it('should throw error if manifest is inputted wrong', () => {
    const badManifest = {
      endpoints: {},
    };
    expect(() => routerCreation(badManifest)).toThrow(
      Error(
        'manifest is not defined in routeCreation function. Please check documentation for MONARQ on how to pass in the manifest properly',
      ),
    );
  });

  describe('Testing express router that is outputted from routerCreation function', () => {
    app.use('/test', returned);
    app.use('/bad', badReturned);

    it('When request is sent, should send back a status code 200 if inputs were correct', (done) => {
      request(app).get('/test/working').expect(200, done);
    });

    it('Should throw error if the executeFn was passed wrong', (done) => {
      request(app).get('/bad/working').expect(500, done);
    });
    it('Should Contain Response back to client', (done) => {
      request(app)
        .get('/test/working')
        .then((response) => {
          expect(response.body.success).toEqual('Test successful');
          done();
        })
        .catch((err) => {
          if (err) console.log(err);
        });
    });

    it('Should Contain Error Response back to client', (done) => {
      request(app)
        .get('/bad/working')
        .then((response) => {
          expect(response.body).toEqual(
            'Issue Executing Request, Please Check Documentation on How to send Request to Server',
          );
          done();
        })
        .catch(done);
    });
  });
});
