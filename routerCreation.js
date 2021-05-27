const express = require('express');

/**
 * 
 * @param {*} manifest: object created by the user. The first key of the manifest object should be 'endpoints'. See the webiste to create your own manifest object easily or look at the readMe on the Github repo for how to format the manifest object properly. 
 * @param {*} createdGQL: object that is outputted from the first function. 
 * @param {*} infoForExecution: object that have three keys inside: 
 * {
 *     schema: GQL Schema
 *     context: Object or Function that returns an object that will be passed to the executeFn to give the resolvers the context object. Here the function passes in the req.headers from the request object as 'headers' so the resolvers has access to the headers for any authorization needs.
 *      executeFn: function. This is a wrapped function that will return the response from your GraphQL/Express server. Have the function return the GraphQL response object in it's entirety. The wrapped function will accept one object that will have four keys: 
 *      {
 *          query: query string,
 *          variables: all necessary variables from the request object,
 *          schema: GQL Schema passed into infoForExecution object
 *          context: Object that was initially passed into by user into infoForExecution that also contains the req.headers value as the key 'headers.
 *      }
 * }
 * 
 * @returns an instance of an express.Router() populated with all the REST API paths that the user defined in the manifest object.
 */


const routerCreation = (
    manifest, 
    createdGQL, 
    infoForExecution 
) => {

    // Creates the instance of the express Router
    const router = express.Router();

    // this function returns the manifest object if it passes the check to make sure manifest is passed in and defined correctly.
    let endPointObj = validateManifest(manifest)

    const { endpoints } = endPointObj;

    // loop through each apiPath and then loops through each method within the specific api path
    Object.keys(endpoints).forEach(apiPath => {

        Object.keys(endpoints[apiPath]).forEach(method => {

        
            let { queries, args } = createdGQL;
            const { defaultParams } = endpoints[apiPath][method];
            let currentQuery;
            
            // taking the args object from the passed createdGQL object, reassigning args to hold the specific args object that points to all the required arguments for the GraphQL operation
            args = args[endpoints[apiPath][method].operation]

            // matching the operation in the manifest object to the query/ mutation that matches in the createdGQL.queries which holds the GQL string that will be passed into the executeFn
            Object.keys(queries).forEach(query => {
                if (query === endpoints[apiPath][method].operation) {
                    currentQuery = queries[query]
                }
            })

            //if the the operation field in the manifest object didn't match any query or mutation in the createdGQL.queries object- throw an error.
            if (!currentQuery) throw new Error('Manifest Obj \'s Operation Field Doesn\'t match Valid Query or Mutation in Schema. Operation Field is Mandatory in Manifest Obj for every method. Check the operation field in the Manifest Object. Visit our website to create a manifest object')

            // this function is invoked in every loop of the apiPath and method. This function will add all the routes to the express.Router declared above and return the router.
            addRoutes(
                method,
                apiPath,
                currentQuery,
                router,
                args,
                defaultParams,
                infoForExecution
            );

        });

    });

    return router
}

/////////////////////////////////
/////                       /////
///// Additional Functions  /////
/////                       /////
/////////////////////////////////

/* validateManifest
Accepts the manifest object created by the user and returns the object as long as at least one apiPath is instantiated inside the object.
*/
const validateManifest  = manifestObj => {

    if (Object.keys(manifestObj.endpoints).length < 1) throw new Error('manifest is not defined in routeCreation function. Please check documentation for MONARQ on how to pass in the manifest properly');

    return manifestObj;
}

/* populateVariables
Accepts the requiredVariables object, default parameters that are defined in the manifest object and a created object that hold the request objects params, query and body values from the express middleware. If the query has no required variables then the value of variables will be null. If not, populateVariables will check if the key in required variables matches values in the reqObj, then the variable will be added to the variables object. This was done to increase security for our users so no client can send extraneous variables that will be passed into the user's GraphQL API. The return of the function checks if variables is populated, if not, it checks in the defaultParams has value in it, and if not returns variables to be null.
*/
const populateVariables = (requiredVariables, defaultParams, reqObj) => {
    if (!requiredVariables) return null;

    let variables = {};

    
    Object.keys(requiredVariables).forEach(key => {
        Object.keys(reqObj).forEach(keyMatch => {
            if (key === `$${keyMatch}`){
                variables[keyMatch] = reqObj[keyMatch]
            }
        })
    })

    return Object.keys(variables).length > 0 ? variables: Object.keys(defaultParams).length > 0 ? defaultParams : null;
}


/**
 * 
 * @param {*} method: String, associated with the key in the manifest object's apiPath object. The only supported HTTP Methods our package supports is GET, POST, PUT, PATCH, and DELETE.
 * @param {*} apiPath: String, associated with the key in the manifest object's endpoint object
 * @param {*} GQLquery: String: associated with the query/mutation string from the createdGQL.queries object.
 * @param {*} router: express.Router: This will be passed in every invocation that will add the routes to the express.Router that will eventually be returned 
 * @param {*} argsForQuery: Object: this holds the required arguments for the GQLquery string if it exists
 * @param {*} defaultParams: Object: declared in the manifest object within the method object. Only required to specify this field in the manifest object if the user's resolver has default parameters. Our function will overwrite those default parameters.
 * @param {*} infoForExecution: Object: the object that was initially passed into routerCreation that will be used to execute the query/mutation string inside the users GraphQL API.
 * 
 */

const addRoutes = (
    method,
    apiPath,
    GQLquery,
    router,
    argsForQuery,
    defaultParams,
    infoForExecution
) => {
    // checks the method string from the manifest object
    switch (method.toLowerCase()) {
        case 'get': {
            router.get(apiPath, async (req, res) => {

                const { query, params, body } = req;

                //order does matter, if query has the same key name in params or body, it will be overwritten when params or body is spread out in possibleInputs object.
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                // security check to check that the variables passed into the GraphQL API will only contain the required variables for that query.
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              //checking if context is a function or an object and adding the headers to that object so the resolvers has access to the headers. It will be saved under the key 'headers'
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                //if context was neither an object or a function that returns an object, an error will be thrown
                if (!newContext || typeof newContext !== 'object') throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function or an object. Please check the documentation for MONARQ further understanding.')

                //creating the object that will be passed into the executeFn user defined
                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                //execute the function that will return the response from the GraphQL API.
                const response = await executeFn(executeObj);

                //if the errors field exists in the response object, client will be notified and the error will log to the console.
                if (response.errors) {
                    res.status(500).json('Issue Executing Request, Please Check Documentation on How to send Request to Server')
                    console.warn(`${response.errors}`)
                    return;
                }

                //the whole response will now be save in the response object
                res.locals.data = response;

                //then the client will be served the GraphQL response object
                return res.status(200).json(res.locals.data);
            })

            break;
        }

        case 'delete': {
            router.delete(apiPath, async (req, res) => {

                const { query, params, body } = req;

                //order does matter, if query has the same key name in params or body, it will be overwritten when params or body is spread out in possibleInputs object.
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                // security check to check that the variables passed into the GraphQL API will only contain the required variables for that query.
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              //checking if context is a function or an object and adding the headers to that object so the resolvers has access to the headers. It will be saved under the key 'headers'
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                //if context was neither an object or a function that returns an object, an error will be thrown
                if (!newContext || typeof newContext !== 'object') throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function or an object. Please check the documentation for MONARQ further understanding.')

                //creating the object that will be passed into the executeFn user defined
                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                //execute the function that will return the response from the GraphQL API.
                const response = await executeFn(executeObj);

                //if the errors field exists in the response object, client will be notified and the error will log to the console.
                if (response.errors) {
                    res.status(500).json('Issue Executing Request, Please Check Documentation on How to send Request to Server')
                    console.warn(`${response.errors}`)
                    return;
                }

                //the whole response will now be save in the response object
                res.locals.data = response;

                //then the client will be served the GraphQL response object
                return res.status(200).json(res.locals.data);
            });

            break;
        }

        case 'post': {
            router.post(apiPath, async (req, res) => {

                const { query, params, body } = req;

                //order does matter, if query has the same key name in params or body, it will be overwritten when params or body is spread out in possibleInputs object.
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                // security check to check that the variables passed into the GraphQL API will only contain the required variables for that query.
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              //checking if context is a function or an object and adding the headers to that object so the resolvers has access to the headers. It will be saved under the key 'headers'
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                //if context was neither an object or a function that returns an object, an error will be thrown
                if (!newContext || typeof newContext !== 'object') throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function or an object. Please check the documentation for MONARQ further understanding.')

                //creating the object that will be passed into the executeFn user defined
                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                //execute the function that will return the response from the GraphQL API.
                const response = await executeFn(executeObj);

                //if the errors field exists in the response object, client will be notified and the error will log to the console.
                if (response.errors) {
                    res.status(500).json('Issue Executing Request, Please Check Documentation on How to send Request to Server')
                    console.warn(`${response.errors}`)
                    return;
                }

                //the whole response will now be save in the response object
                res.locals.data = response;

                //then the client will be served the GraphQL response object
                return res.status(200).json(res.locals.data);
            });

            break;
        }

        case 'put': {
            router.put(apiPath, async (req, res) => {

                const { query, params, body } = req;

                //order does matter, if query has the same key name in params or body, it will be overwritten when params or body is spread out in possibleInputs object.
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                // security check to check that the variables passed into the GraphQL API will only contain the required variables for that query.
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              //checking if context is a function or an object and adding the headers to that object so the resolvers has access to the headers. It will be saved under the key 'headers'
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                //if context was neither an object or a function that returns an object, an error will be thrown
                if (!newContext || typeof newContext !== 'object') throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function or an object. Please check the documentation for MONARQ further understanding.')

                //creating the object that will be passed into the executeFn user defined
                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                //execute the function that will return the response from the GraphQL API.
                const response = await executeFn(executeObj);

                //if the errors field exists in the response object, client will be notified and the error will log to the console.
                if (response.errors) {
                    res.status(500).json('Issue Executing Request, Please Check Documentation on How to send Request to Server')
                    console.warn(`${response.errors}`)
                    return;
                }

                //the whole response will now be save in the response object
                res.locals.data = response;

                //then the client will be served the GraphQL response object
                return res.status(200).json(res.locals.data);
            });

            break;
        }

        case 'patch': {
            router.patch(apiPath, async (req, res) => {

                const { query, params, body } = req;

                //order does matter, if query has the same key name in params or body, it will be overwritten when params or body is spread out in possibleInputs object.
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                // security check to check that the variables passed into the GraphQL API will only contain the required variables for that query.
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              //checking if context is a function or an object and adding the headers to that object so the resolvers has access to the headers. It will be saved under the key 'headers'
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                //if context was neither an object or a function that returns an object, an error will be thrown
                if (!newContext || typeof newContext !== 'object') throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function or an object. Please check the documentation for MONARQ further understanding.')

                //creating the object that will be passed into the executeFn user defined
                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                //execute the function that will return the response from the GraphQL API.
                const response = await executeFn(executeObj);

                //if the errors field exists in the response object, client will be notified and the error will log to the console.
                if (response.errors) {
                    res.status(500).json('Issue Executing Request, Please Check Documentation on How to send Request to Server')
                    console.warn(`${response.errors}`)
                    return;
                }

                //the whole response will now be save in the response object
                res.locals.data = response;

                //then the client will be served the GraphQL response object
                return res.status(200).json(res.locals.data);

            });

            break;
        }

        // if the method doesn't match the supported HTTP methods of GET, POST, PUT, PATCH or DELETE, an error will be thrown.
        default: throw new Error('Operation Doesn\'t match the HTTP Methods allowed for this NPM Package, Please see documentation on which HTTP Methods are allowed and/or check the Manifest Object\'s Method Object');
    }
}

module.exports = routerCreation;