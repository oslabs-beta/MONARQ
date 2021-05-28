const express = require('express');

/**
 * routerCreation: Function: takes in three arguments and returns and instance of an express.Router. The user would then save the returned result as a variable to use in their GraphQL/Express server to route all REST requests through. 
 * @param {Object} manifest: Created by the user. The first key of the manifest object should be 'endpoints'. See the webiste to create your own manifest object easily or look at the readMe on the Github repo for how to format the manifest object properly. 
 * @param {Object} createdGQL: Output from the function queryMap. 
 * @param {Object} infoForExecution: Has three keys: 
 * {
 *     schema: GQL Schema
 *     context: Object, or a Function that returns an object: this is passed to the executeFn for the GraphQL resolvers. Here the function passes in the req.headers from the request object as 'headers' so the resolvers have access to the headers for any authorization needs.
 *      executeFn: Function: this is a wrapped function created by the user that will return the response from your GraphQL/Express server. Have the function return the GraphQL response object in it's entirety. The wrapped function will accept one object that will have four keys: 
 *      {
 *          query: String: specific query/mutation from the object outputted by queryMap,
 *          variables: Object or Null: all necessary variables from the request object, if no variables are required, passed in or no defaultParams are defined in the manifest object, the variables value will be null,
 *          schema: GQL Schema: passed into infoForExecution object,
 *          context: Object: this was initally passed into routerCreation's infoForExecution object as either a Function that returns an object or an Object plainly. routerCreation will pass the request object's headers into the context object with the key of 'headers' for the resolvers to have access to.
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

    // Creates the instance of the express Router.
    const router = express.Router();

    // This function returns the manifest object if it passes the check to make sure manifest is passed in and defined correctly.
    let endPointObj = validateManifest(manifest)

    const { endpoints } = endPointObj;

    // Loop through each apiPath and then loops through each method within the specific apiPath.
    Object.keys(endpoints).forEach(apiPath => {

        Object.keys(endpoints[apiPath]).forEach(method => {

        
            let { queries, args } = createdGQL;
            const { defaultParams } = endpoints[apiPath][method];
            let currentQuery;
            
            // Taking the args object from the passed createdGQL object (which is the returned result of the function queryMap), and reassigning args to hold the specific arguments object that holds all the required arguments for the GraphQL operation.
            args = args[endpoints[apiPath][method].operation];

            // Matching the operation in the manifest object to the query/ mutation that matches in the createdGQL.queries (which holds the GQL string) that will be passed into the executeFn.
            Object.keys(queries).forEach(query => {
                if (query === endpoints[apiPath][method].operation) {
                    currentQuery = queries[query];
                }
            });

            //If the the operation field in the manifest object didn't match any query or mutation in the createdGQL.queries object- throw an error.
            if (!currentQuery) throw new Error('Manifest Obj \'s Operation Field Doesn\'t match Valid Query or Mutation in Schema. Operation Field is Mandatory in Manifest Obj for every method. Check the operation field in the Manifest Object. Visit our website to create a manifest object');

            // This function is invoked in every loop of the apiPath and method. This function will add all the routes to the express.Router declared above.
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

    return router;
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
Accepts:
    requiredVariables: Object, 
    defaultParams: Object or Null: this is defined in the manifest object
    reqObj: Object: a created object that holds the request object's params, query and body values from the express middleware.
      
    If the query has no required variables, then the value of variables will be null. If not, populateVariables will check if the key in required variables matches the reqObj keys, if it does then the variable will be added to the variables object. This was done to increase security for our users so no client can send extraneous variables that will be passed into the user's GraphQL API. 
    
    The return of the function checks if variables is populated, if not, it checks in the defaultParams have a value in it, and if not returns variables to be null.
*/
const populateVariables = (requiredVariables, defaultParams, reqObj) => {
    if (requiredVariables === undefined || requiredVariables === null) return null;

    let variables = {};

    
    Object.keys(requiredVariables).forEach(key => {
        Object.keys(reqObj).forEach(keyMatch => {
            if (key === `$${keyMatch}`){
                variables[keyMatch] = reqObj[keyMatch];
            }
        })
    })

    return Object.keys(variables).length > 0 ? variables: (defaultParams !== undefined || defaultParams !== null) ? defaultParams : null;
}


/**
 * addRoutes: Function that adds the routes to the express.Router
 * @param {String} method: Associated with the key in the manifest object's apiPath object. The only supported HTTP Methods our package supports is GET, POST, PUT, PATCH, and DELETE.
 * @param {String} apiPath: Associated with the key in the manifest object's endpoint object
 * @param {String} GQLquery: Associated with the query/mutation string from the createdGQL.queries object.
 * @param {express.Router} router: This will be passed in every invocation that will add the routes to the express.Router
 * @param {Object} argsForQuery: This holds the required arguments for the GQLquery string if it exists
 * @param {Object} defaultParams: Declared in the manifest object within the method object. Only required to specify this field in the manifest object if the user's resolver has default parameters. Our function will overwrite those default parameters.
 * @param {Object} infoForExecution: The object that was initially passed into routerCreation that will be used to execute the query/mutation string inside the users GraphQL API.
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

                // Order does matter here, if req.query has the same key as req.params or req.body, it will be overwritten when params or body is spread out in possibleInputs object.
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                // Security check to ensure the variables passed into the GraphQL API will only contain the required variables for that query/mutation.
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);

              // Checking if context is a function or an object. Then adds the req.headers to the newContext object so the resolvers have access to the headers. It will be saved under the key 'headers'.
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                // If context was neither an object or a function that returns an object, an error will be thrown
                if (!newContext || typeof newContext !== 'object') throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function that returns an object or an object plainly. Please check the documentation on the MONARQ repo or the website for further understanding.');

                // Creating the object that will be passed into the executeFn the user defined.
                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                // Execute the function that will return the response from the GraphQL API.
                const response = await executeFn(executeObj);
          
                if (response.errors) {
                    res.status(500).json(`Issue Executing Request: ${response.errors[0].message}`)
                    console.warn(`${response.errors}`)
                    return;
                }

                // The whole response from the GraphQL API will now be saved in the response object.
                res.locals.data = response;

                // Then the client will be served the GraphQL response object.
                return res.status(200).json(res.locals.data);
            })

            break;
        }

        case 'delete': {
            router.delete(apiPath, async (req, res) => {

                const { query, params, body } = req;

                // Order does matter here, if req.query has the same key as req.params or req.body, it will be overwritten when params or body is spread out in possibleInputs object.
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                // Security check to ensure the variables passed into the GraphQL API will only contain the required variables for that query/mutation.
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              // Checking if context is a function or an object. Then adds the req.headers to the newContext object so the resolvers have access to the headers. It will be saved under the key 'headers'.
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                // If context was neither an object or a function that returns an object, an error will be thrown.
                if (!newContext || typeof newContext !== 'object') throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function that returns an object or an object plainly. Please check the documentation on the MONARQ repo or the website for further understanding.');

                // Creating the object that will be passed into the executeFn the user defined.
                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                // Execute the function that will return the response from the GraphQL API.
                const response = await executeFn(executeObj);

                // If the errors field exists in the response object, client will be notified and the error will log to the console.
                if (response.errors) {
                    res.status(500).json(`Issue Executing Request: ${response.errors[0].message}`)
                    console.warn(`${response.errors}`)
                    return;
                }

                // The whole response from the GraphQL API will now be saved in the response object.
                res.locals.data = response;

                // Then the client will be served the GraphQL response object.
                return res.status(200).json(res.locals.data);
            });

            break;
        }

        case 'post': {
            router.post(apiPath, async (req, res) => {

                const { query, params, body } = req;

                // Order does matter here, if req.query has the same key as req.params or req.body, it will be overwritten when params or body is spread out in possibleInputs object.
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                // Security check to ensure the variables passed into the GraphQL API will only contain the required variables for that query/mutation.
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              // Checking if context is a function or an object. Then adds the req.headers to the newContext object so the resolvers have access to the headers. It will be saved under the key 'headers'.
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                // If context was neither an object or a function that returns an object, an error will be thrown.
                if (!newContext || typeof newContext !== 'object') throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function that returns an object or an object plainly. Please check the documentation on the MONARQ repo or the website for further understanding.');

                // Creating the object that will be passed into the executeFn the user defined.
                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                // Execute the function that will return the response from the GraphQL API.
                const response = await executeFn(executeObj);

                // If the errors field exists in the response object, client will be notified and the error will log to the console.
                if (response.errors) {
                    res.status(500).json(`Issue Executing Request: ${response.errors[0].message}`)
                    console.warn(`${response.errors}`)
                    return;
                }

                // The whole response from the GraphQL API will now be saved in the response object.
                res.locals.data = response;

                // Then the client will be served the GraphQL response object.
                return res.status(200).json(res.locals.data);
            });

            break;
        }

        case 'put': {
            router.put(apiPath, async (req, res) => {

                const { query, params, body } = req;

                // Order does matter here, if req.query has the same key as req.params or req.body, it will be overwritten when params or body is spread out in possibleInputs object.
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                // Security check to ensure the variables passed into the GraphQL API will only contain the required variables for that query/mutation.
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              // Checking if context is a function or an object. Then adds the req.headers to the newContext object so the resolvers have access to the headers. It will be saved under the key 'headers'.
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                // If context was neither an object or a function that returns an object, an error will be thrown.
                if (!newContext || typeof newContext !== 'object') throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function that returns an object or an object plainly. Please check the documentation on the MONARQ repo or the website for further understanding.');

                // Creating the object that will be passed into the executeFn the user defined.
                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                // Execute the function that will return the response from the GraphQL API.
                const response = await executeFn(executeObj);

                // If the errors field exists in the response object, client will be notified and the error will log to the console.
                if (response.errors) {
                    res.status(500).json(`Issue Executing Request: ${response.errors[0].message}`)
                    console.warn(`${response.errors}`)
                    return;
                }

                // The whole response from the GraphQL API will now be saved in the response object.
                res.locals.data = response;

                // Then the client will be served the GraphQL response object.
                return res.status(200).json(res.locals.data);
            });

            break;
        }

        case 'patch': {
            router.patch(apiPath, async (req, res) => {

                const { query, params, body } = req;

                // Order does matter here, if req.query has the same key as req.params or req.body, it will be overwritten when params or body is spread out in possibleInputs object.
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                // Security check to ensure the variables passed into the GraphQL API will only contain the required variables for that query/mutation.
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              // Checking if context is a function or an object. Then adds the req.headers to the newContext object so the resolvers have access to the headers. It will be saved under the key 'headers'.
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                // If context was neither an object or a function that returns an object, an error will be thrown.
                if (!newContext || typeof newContext !== 'object') throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function that returns an object or an object plainly. Please check the documentation on the MONARQ repo or the website for further understanding.');

                // Creating the object that will be passed into the executeFn the user defined.
                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                // Execute the function that will return the response from the GraphQL API.
                const response = await executeFn(executeObj);

                // If the errors field exists in the response object, client will be notified and the error will log to the console.
                if (response.errors) {
                    res.status(500).json(`Issue Executing Request: ${response.errors[0].message}`)
                    console.warn(`${response.errors}`)
                    return;
                }

                // The whole response from the GraphQL API will now be saved in the response object.
                res.locals.data = response;

                // Then the client will be served the GraphQL response object.
                return res.status(200).json(res.locals.data);

            });

            break;
        }

        // If the method doesn't match the supported HTTP methods of GET, POST, PUT, PATCH or DELETE, an error will be thrown.
        default: throw new Error('Operation Doesn\'t match the HTTP Methods allowed for this NPM Package, Please see documentation on which HTTP Methods are allowed and/or check the Manifest Object\'s Method Object');
    }
}

module.exports = routerCreation;