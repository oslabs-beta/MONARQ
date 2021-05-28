const express = require('express');


//everything that errors out in routerCreationFunction should throw an error
module.exports = routerCreation = (
    manifest, //from the manifest file 
    createdGQL, //object that contains queries/mutations that were created with the previous function
    infoForExecution //object that will have three keys- schema, context and wrapper function that will execute the graphql query
) => {

    const router = express.Router();


    let endPointObj = validateManifest(manifest)


    const { endpoints } = endPointObj;

    Object.keys(endpoints).forEach(apiPath => {

        Object.keys(endpoints[apiPath]).forEach(method => {
            let { queries, args } = createdGQL;
            const { defaultParams } = endpoints[apiPath][method];
            let currentQuery;
            
            args = args[endpoints[apiPath][method].operation]

            Object.keys(queries).forEach(query => {
                if (query === endpoints[apiPath][method].operation) {
                    currentQuery = queries[query]
                }
            })

            if (!currentQuery) throw new Error('Manifest Obj \'s Operation Field Doesn\'t match Valid Query or Mutation in Schema. Operation Field is Mandatory in Manifest Obj for every method. Check the operation field in the Manifest Object. Visit our website to create a manifest object')


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
/////    Helper Functions   /////
/////                       /////
/////////////////////////////////

const validateManifest  = manifestObj => {
    if (Object.keys(manifestObj.endpoints).length < 1) throw new Error('manifest is not defined in routeCreation function. Please check documentation for MONARQ on how to pass in the manifest properly');

    return manifestObj;
}

const populateVariables = (requiredVariables, defaultParams, reqObj) => {
    if (!requiredVariables) return;

    let variables = {};

    
    Object.keys(requiredVariables).forEach(key => {
        const keyTrim = key.slice(1, key.length)
        console.log('keyTrim', keyTrim)
        console.log('in the outer loop')
        Object.keys(reqObj).forEach(keyMatch => {
            if (key === `$${keyMatch}`){
                variables[keyMatch] = reqObj[keyMatch]
                console.log('in the inner loop')
            }
            if (!reqObj[keyTrim] && !defaultParams) {
              console.log('in the error loop')
              // throw new Error(`Missing argument '${keyTrim}' of type '${requiredVariables[key]}'. Please add this to the request.`);
            }
        })
    })

    console.log('variables obj within func', variables)
    return Object.keys(variables).length > 0 ? variables: defaultParams ? defaultParams : null;
}


/* Everything in addRoutes function should:
    a) send response status and message to client
    b) warm in the console the error that is returned from graphql
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

    switch (method.toLowerCase()) {
        case 'get': {
            router.get(apiPath, async (req, res) => {

                const { query, params, body } = req;

                //order does matter, if query has the same key name in params or body, it will be overwritten when params or body is spread
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);

              //checking if context is a function or and object and adding the headers to that object
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                if (!newContext) throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function or an object. Please check the documentation for MONARQ further understanding.')

                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                const response = await executeFn(executeObj);
          
                if (response.errors) {
                    res.status(500).json(`Issue Executing Request: ${response.errors[0].message}`)
                    console.warn(`${response.errors}`)
                    return;
                }

                res.locals.data = response;

                return res.status(200).json(res.locals.data);
            })

            break;
        }

        case 'delete': {
            router.delete(apiPath, async (req, res) => {

                const { query, params, body } = req;

                //order does matter, if query has the same key name in params or body, it will be overwritten when params or body is spread
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              //checking if context is a function or and object and adding the headers to that object
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                if (!newContext) throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function or an object. Please check the documentation for MONARQ further understanding.')

                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                const response = await executeFn(executeObj);

                if (response.errors) {
                    res.status(500).json(`Issue Executing Request: ${response.errors[0].message}`)
                    console.warn(`${response.errors}`)
                    return;
                }

                res.locals.data = response;

                return res.status(200).json(res.locals.data);
            });

            break;
        }

        case 'post': {
            router.post(apiPath, async (req, res) => {

                const { query, params, body } = req;

                //order does matter, if query has the same key name in params or body, it will be overwritten when params or body is spread
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              //checking if context is a function or and object and adding the headers to that object
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                if (!newContext) throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function or an object. Please check the documentation for MONARQ further understanding.')

                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                const response = await executeFn(executeObj);

                if (response.errors) {
                    res.status(500).json(`Issue Executing Request: ${response.errors[0].message}`)
                    console.warn(`${response.errors}`)
                    return;
                }

                res.locals.data = response;

                return res.status(200).json(res.locals.data);
            });

            break;
        }

        case 'put': {
            router.put(apiPath, async (req, res) => {

                const { query, params, body } = req;

                //order does matter, if query has the same key name in params or body, it will be overwritten when params or body is spread
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              //checking if context is a function or and object and adding the headers to that object
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                if (!newContext) throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function or an object. Please check the documentation for MONARQ further understanding.')

                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                const response = await executeFn(executeObj);

                if (response.errors) {
                    res.status(500).json(`Issue Executing Request: ${response.errors[0].message}`)
                    console.warn(`${response.errors}`)
                    return;
                }

                res.locals.data = response;

                return res.status(200).json(res.locals.data);

            });

            break;
        }

        case 'patch': {
            router.patch(apiPath, async (req, res) => {

                const { query, params, body } = req;

                //order does matter, if query has the same key name in params or body, it will be overwritten when params or body is spread
                const possibleInputs = {
                    ...query,
                    ...params,
                    ...body
                };
                
                const { schema, context, executeFn } = infoForExecution;
                
                const variables = populateVariables(argsForQuery, defaultParams, possibleInputs);
                

              //checking if context is a function or and object and adding the headers to that object
                let newContext;

                if (typeof context === 'function') {
                    newContext = await context();
                    newContext.headers = req.headers;
                }  else if (typeof context === 'object') {
                    newContext = context;
                    newContext.headers = req.headers;
                }

                if (!newContext) throw new Error('Context was not passed in correctly, could not execute the query. Make sure context is either a function or an object. Please check the documentation for MONARQ further understanding.')

                const executeObj = {
                    query: GQLquery,
                    variables: variables,
                    schema,
                    context: newContext
                }

                const response = await executeFn(executeObj);

                if (response.errors) {
                    res.status(500).json(`Issue Executing Request: ${response.errors[0].message}`)
                    console.warn(`${response.errors}`)
                    return;
                }

                res.locals.data = response;

                return res.status(200).json(res.locals.data);

            });

            break;
        }

        default: throw new Error('Operation Doesn\'t match the HTTP Methods allowed for this NPM Package, Please see documentation on which HTTP Methods are allowed and/or check the Manifest Object\'s Method Object');
    }
}

