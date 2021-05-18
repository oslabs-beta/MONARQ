// note: was not able to use the import syntax, but the const + require language did work
// import { graphql, buildSchema, makeExecutableSchema } from 'graphql'
const graphql = require('graphql');
const path = require('path');
const fs = require('fs');
import schema from '../graphql/schema';
import { manifest } from './dummyManifestAndQueryObj.js';

// user will designate REST endpoints, but assumption is that a GQL operation already exists for each one
// error handling - if an invalid/non-existent operation is specified
// we need to create a list of all the queries that match up with a specific endpoint
// look up the operation value within the schema file and compose the GQL query
// assumption: any operation being used for a REST endpoint will have its "fully expanded" query returned (e.g., every scalar field) and it cannot contain nested references (? - TBD) 
// need to handle and have placeholders for parameter fields when necessary
// whether these are stored in multiple files or one file can be determined later
// this list of queries will then be referenced by the middleware based on the REST request received
// look up the path of the request (either within the manifest file or directly on the file that has the query operations) to find the corresponding query
// pass the query into the execution function


// *** NEED TO HAVE USER UPDATE THIS LIST IF THEY HAVE ANY CUSTOM SCALARS
// this customScalars array will be exposed to users
const customScalars = ['Date'];

// this scalarTypes array will be hidden from users
const scalarTypes = ['String', 'Int', 'ID', 'Boolean', 'Float', ...customScalars]



/************************************************* 
***** FINAL QUERY OBJECT OUTPUT FUNCTION *********
**************************************************/

function queryObject(manifest, schema) {
  const endPoints = manifest.endpoints;
  let returnObj = {};
  for (const path in endPoints) {
    for (const action in endPoints[path]) {
      const operationName = endPoints[path][action].operation
      returnObj[operationName] = generateQuery(schema, operationName);
    };
  };
  return returnObj;
}



/********************************** 
***** QUERY GENERATOR FUNCTION ****
***********************************/

function generateQuery(schema, operation) {
  // first figure out whether it is a query or mutation
  let operationType;
  let typeSchema;
  const querySchema = schema.getQueryType().getFields();
  const mutationSchema = schema.getMutationType().getFields();
  if (Object.keys(querySchema).includes(operation)) {
    operationType = 'Query';
    typeSchema = querySchema;
  };
  if (Object.keys(mutationSchema).includes(operation)) {
    operationType = 'Mutation';
    typeSchema = mutationSchema;
  };

  // now look for all of the fields that need to be specified for the operation
  let returnFields = {};
  let operationFields = typeSchema[operation];
  let customTypeFields;
  let customType;
  let recursiveBreak = [];

  // check to see if the type is a scalar type -> if not, then need to look up the fields for each type
  // NOTE: operationFields.type (e.g., User!) is type Object, not String
  const operationFieldsTypeTrim = typeTrim(operationFields.type.toString());

  if (scalarTypes.includes(operationFieldsTypeTrim)) returnFields[operationFieldsTypeTrim] = '';
  else {
    customType = operationFields.type;
    customTypeFields = schema.getType(typeTrim(operationFields.type.toString())).getFields()
    // use the grabFields helper function to recurse through each fields schema until we have all scalar fields for a type
    returnFields = grabFields(schema, customType, customTypeFields, recursiveBreak);
  }
  // invoke buildString to create the string form of the query field
  const queryString = buildString(returnFields);

  // invoke grabArgs + buildString + argsStrFormatter if the type.args object is not empty
  let argsString;
  let varsString;
  if (operationFields.args.length) {

    const argsObj = grabArgs(schema, operationFields.args)[0];
    const argsVal = argsStrFormatter(buildString(argsObj));
    argsString = `( ${argsVal} )`;
    const varObj = grabArgs(schema, operationFields.args)[1];
    const varsVal = varStrBuild(varObj);
    varsString = `( ${varsVal} )`
    // below is specifically for the creation of the args dictionary
    argsObj[operation] = argsVal;
  } else {
    argsString = '';
    varsString = '';
  }

  // the final query string is composed of the operation type + name of operation (args) + fields
  const returnString = `${operationType.toLowerCase()} ${varsString} { ${operation} ${argsString} { ${queryString} } }`
  return returnString;
}



/************************** 
***** HELPER FUNCTIONS ****
***************************/

/* converts custom type text to simple strings (removes [] and !) */
function typeTrim(type) {
  const typeArr = type.split('');
  const trimArr = [];
  for (let i = 0; i < typeArr.length; i++) {
    if (typeArr[i] !== '[' && typeArr[i] !== ']' && typeArr[i] !== '!') {
      trimArr.push(typeArr[i])
    }
  }
  return trimArr.join('');
}



/* recursive function which collects all of the fields associated with a type; if the field is scalar type, it adds to the return object;
if the field is a custom type, the function is invoked again on that field's schema fields continues recursively until only scalar types are found;
this function ignores situations where a custom type has itself as a field, as this provides duplicative information & causes endless loops */

// this is a helper function that will track the number of times a customType has had grabFields invoked on it
// used to ensure that we run 1 layer of circular calls to get all fields, while avoiding a max callstack error
function countOccurrences(array, val) {
  return array.reduce((a, v) => (v === val ? a + 1 : a), 0);
}

function grabFields(schema, customTypeName, customTypeSchema, recursiveBreakArr) {
  let returnObj = {};
  for (const key in customTypeSchema) {
    let typeString = typeTrim(customTypeSchema[key].type.toString());
    if (scalarTypes.includes(typeString)) returnObj[key] = '';
    else {
      if (typeString !== customTypeName.toString()) {
        recursiveBreakArr.push(typeString);
        if (countOccurrences(recursiveBreakArr, typeString) < 2) {
          returnObj[key] = grabFields(schema, typeString, schema.getType(typeString).getFields(), recursiveBreakArr);
        }
      }
    }
  }
  return returnObj;
}



/* convert the query/args object to string version; called recursively if there are nested type objs */
function buildString(fieldsObj) {
  const queryArr = [];
  for (const key in fieldsObj) {
    queryArr.push(key);
    if (fieldsObj[key] !== '') {
      queryArr.push('{');
      queryArr.push(buildString(fieldsObj[key]));
      queryArr.push('}');
    };
  };
  return queryArr.join(' ');
};



/* collects all of the arguments, handling all potential cases:
  1) single scalar arg
  2) multiple scalar args
  3) custom input types as args */
function grabArgs(schema, argsArr) {
  const returnArgsObj = {};
  const returnVarsObj = {};
  for (let i = 0; i < argsArr.length; i++) {
    let typeString = typeTrim(argsArr[i].type.toString());
    if (scalarTypes.includes(typeString)) {
      returnArgsObj[argsArr[i].name] = '';
      returnVarsObj[`$${argsArr[i].name}`] = argsArr[i].type.toString();
    } else {
      const nestedFields = grabFields(schema, typeString, schema.getType(typeString).getFields());
      returnArgsObj[argsArr[i].name] = nestedFields;
      for(const field in nestedFields) {
        returnVarsObj[`$${field}`] = schema.getType(typeString).getFields()[field].type;
      };
    };
  };

  return [returnArgsObj, returnVarsObj];
};



/* formats the args string into the arg:$arg format */
function argsStrFormatter(str) {
  let strArray = str.split(' ');
  //console.log('strArray', strArray)
  const insIndex = strArray.indexOf('{');
  if (insIndex > 0) {
    for (let i = insIndex + 1; i < strArray.length - 1; i++) {
      strArray[i] = `${strArray[i]}:$${strArray[i]},`
    };
    // revisit for refactoring to handle more potential situations (currently line below handles a case like updateBook which has both scalar and custom argument types)
    if(insIndex > 1) strArray[0] = `${strArray[0]}:$${strArray[0]},`
    strArray.splice(insIndex, 0, ':');
  }
  else {
    for (let i = 0; i < strArray.length; i++) {
      strArray[i] = `${strArray[i]}:$${strArray[i]},`
    }
  }
  return strArray.join(' ');
};



/* formats the args string into the $var: type format for variables */
function varStrBuild(varObj) {
  const varArr = [];
  for (const key in varObj) {
    varArr.push(`${key}:`);
    varArr.push(`${varObj[key]},`);
  };
  return varArr.join(' ');
}




export default queryObject;




