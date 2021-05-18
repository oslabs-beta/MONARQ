import express from 'express';
import fetch from 'node-fetch';

export const routerCreation = (
    endPointObject, //from the manifest file 
    createdGQL //object that contains queries/mutations that were created with the previous function
) => {

    const router = express.Router();

    //*MAY NEED TO UNSTRINGIFY THE MANIFEST JSON OBJECT WHEN IMPORTING *//
    if (!endPointObject || !createdGQL) throw new Error('Arguments not passed in Correctly into routerCreation function')


    const { endpoints } = endPointObject;

    Object.keys(endpoints).forEach(apiPath => {

        Object.keys(endpoints[apiPath]).forEach(method => {

            let currentQuery;

            for (let query in createdGQL) {
                if (query === endpoints[apiPath][method].operation) {
                    currentQuery = createdGQL[query]
                }
            }

            addRoutes(
                method,
                apiPath,
                currentQuery,
                router
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

const addRoutes = (
    method,
    apiPath,
    GQLquery,
    router
) => {

    switch (method.toLowerCase()) {
        case 'get': {
            router.get(apiPath, async (req, res) => {

                const { query, params, body } = req;
                //can add addition error logic/security here
                const variables = {
                    ...query,
                    ...params,
                    ...body
                };

                fetch('http://localhost:3000/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: GQLquery,
                        variables: variables
                    })
                }).then(data => data.json()).then(responseGQL => {
                    res.locals.response = responseGQL;
                    return res.status(200).json(res.locals.response)
                }).catch(err => console.log(err));

            })

            break;
        }

        case 'delete': {
            router.delete(apiPath, async (req, res) => {

                const { query, params, body } = req;
                //can add addition error logic/security here
                const variables = {
                    ...query,
                    ...params,
                    ...body
                };

                fetch('http://localhost:3000/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: GQLquery,
                        variables: variables
                    })
                }).then(data => data.json()).then(responseGQL => {
                    res.locals.response = responseGQL;
                    return res.status(200).json(res.locals.response)
                }).catch(err => console.log(err))

            });

            break;
        }

        case 'post': {
            router.post(apiPath, async (req, res) => {

                const { query, params, body } = req;
                //can add addition error logic/security here
                const variables = {
                    ...query,
                    ...params,
                    ...body
                }

                fetch('http://localhost:3000/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: GQLquery,
                        variables: variables
                    })
                }).then(data => data.json()).then(responseGQL => {
                    res.locals.response = responseGQL;
                    return res.status(200).json(res.locals.response)
                }).catch(err => console.log(err))

            });

            break;
        }

        case 'put': {
            router.put(apiPath, async (req, res) => {

                const { query, params, body } = req;
                //can add addition error logic/security here
                const variables = {
                    ...query,
                    ...params,
                    ...body
                }

                fetch('http://localhost:3000/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: GQLquery,
                        variables: variables
                    })
                }).then(data => data.json()).then(responseGQL => {
                    res.locals.response = responseGQL;
                    return res.status(200).json(res.locals.response)
                }).catch(err => console.log(err))

            });

            break;
        }

        case 'patch': {
            router.patch(apiPath, async (req, res) => {

                const { query, params, body } = req;
                //can add addition error logic/security here
                const variables = {
                    ...query,
                    ...params,
                    ...body
                }

                fetch('http://localhost:3000/graphql', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: GQLquery,
                        variables: variables
                    })
                }).then(data => data.json()).then(responseGQL => {
                    res.locals.response = responseGQL;
                    return res.status(200).json(res.locals.response)
                }).catch(err => console.log(err))

            });

            break;
        }

        default: throw new Error('Operation Doesn\'t match the HTTP Methods allowed for this NPM Package, Please see documentation on which HTTP Methods are allowed and/or check the Manifest Object');
    }
}

