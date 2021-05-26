const routerCreation = require('../routerCreation.js');
const express = require('express')
const request = require('supertest');
const app = express();

describe('routeCreation Function Test', () => {
    const manifest = {
        endpoints: {
            '/working' : {
                get: {
                    operation: 'yes'
                }
            }
        }
    }

    const queryMap = {
        args: {
            yes: { yes: 'This is the args'}
        },
        queries: {
            yes: 'This is the query'
        }
    }

    const executeFn = jest.fn()
    const returned = routerCreation(manifest, queryMap, {
        schema: 'This is Schema',
        context: {
            info: 'This is Context'
        },
        executeFn
    })
   
    beforeAll(() => {
        
    })

    it('should return an express router function', () => {
        expect(typeof returned).toEqual('function')
    })

    it('should have a stack with one element in it', () => {
        expect(returned.stack.length).toEqual(1)
    })

    it('should throw error if manifest is inputted wrong', () => {
        const badManifest = {
            endpoints: { }
        }
        expect(() => routerCreation(badManifest)).toThrow(Error('manifest is not defined in routeCreation function. Please check documentation for MONARQ on how to pass in the manifest properly'))
    })
    
    describe('Testing express router that is outputted from routerCreation function', ()=> {
        app.use('/test', returned);

        it('When request is sent, should send back a status code 200 if inputs were correct', (done) => {
            request(app)
            .get('/test/working')
            .expect(200, done)
        })
    })

})