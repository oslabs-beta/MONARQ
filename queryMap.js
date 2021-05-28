/******************************************************** 
***** ARGS & QUERY OBJECT OUTPUT FUNCTION ***************
********************************************************/

/**
 * 
 * @param {*} manifest: the manifest object created by the user, which contains REST endpoints and corresponding GraphQL operations
 * @param {*} schema: the schema that contains all relevant GraphQL operations and types, including those specified in the manifest; must be a GraphQLSchema object
 * @param {*} customScalars: an array containing all custom scalar types that exist in the schema argument; each element should be a custom scalar type and in string format (e.g., ['Month', 'Year'])
  // if no custom scalar types are used in the schema, then do not pass an argument for this parameter 
 * @returns: an object containing the two keys below; this is an input into the routerCreation function.
  // args: an object composed of key-value pairs for any operations (keys) that have argument inputs (values); note that operations without argument inputs will not be included here 
  // queries: an object composed of key-value pairs for all operations (keys) specified in the manifest and the corresponding GraphQL schema (values) to be invoked 
 */

const queryMap = (manifest, schema, customScalars = []) => {
  if(typeof manifest !== 'object') throw new Error('manifest argument must an object');
  if(typeof schema !== 'object') throw new Error('schema argument must be a GraphQLSchema object');
  if(typeof customScalars !== 'object') throw new Error('customScalars argument must be an array');

  const endPoints = manifest.endpoints;
  const argsObj = {};
  const queryObj = {};
  const scalarTypes = ['String', 'Int', 'ID', 'Boolean', 'Float', ...customScalars]
  for (const path of Object.keys(endPoints)) {
    for (const action of Object.keys(endPoints[path])) {
      const operationName = endPoints[path][action].operation
      // generate the args object
      const typeSchema = typeChecker(schema, operationName)[1]
      const operationFields = typeSchema[operationName];
      const varObj = grabArgs(schema, operationFields.args, scalarTypes)[1];
      argsObj[operationName] = varObj

      // generate the query object
      queryObj[operationName] = generateQuery(schema, operationName, scalarTypes);
    };
  };
  return {
    args: argsObj,
    queries: queryObj
  };
};



/********************************** 
***** QUERY GENERATOR FUNCTION ****
**********************************/
// This is invoked within queryMap; can also be used to generate the GraphQL fully expanded query string for any single operation

/**
 * 
 * @param {*} schema: same schema that is passed into queryMap 
 * @param {*} operation: a GraphQL operation that has been mapped to a REST endpoint within the manifest object
 * @param {*} scalarTypes: an array containing all standard scalar types as well as any custom scalar types that have been declared in the schema (scalarTypes is declared in queryMap and this is a pass-through parameter)
 * @returns: a string comprising the GraphQL query that corresponds to the operation argument; this query will be passed to the GraphQL server each time a request is made to the corresponding REST endpoint
  // The query string includes whichever parts are relevant to the operation, including the operation type, variables specification, operation name, arguments specification, fields specification (all available fields are requested)
 */

const generateQuery = (schema, operation, scalarTypes) => {
  //  determine whether it is a query or mutation
  const typeInfo = typeChecker(schema, operation)
  const operationType = typeInfo[0];
  const typeSchema = typeInfo[1];

  // look for all of the fields that need to be specified for the operation
  let returnFields = {};
  const operationFields = typeSchema[operation];
  let customTypeFields;
  let customType;
  const recursiveBreak = [];

  // check to see if the type is a scalar type -> if not, then need to look up the fields for each type
  const operationFieldsTypeTrim = typeTrim(operationFields.type.toString());
  if (scalarTypes.includes(operationFieldsTypeTrim)) returnFields[operationFieldsTypeTrim] = '';
  else {
    customType = operationFields.type;
    customTypeFields = schema.getType(typeTrim(operationFields.type.toString())).getFields()
    returnFields = grabFields(schema, customType, customTypeFields, recursiveBreak, scalarTypes);
  }
  const queryString = buildString(returnFields);

  // compose the variable and argument portions of the query if necessary
  let argsString;
  let varsString;
  if (operationFields.args.length) {
    const argsObj = grabArgs(schema, operationFields.args, scalarTypes)[0];
    const argsVal = argsStrFormatter(buildString(argsObj));
    argsString = `( ${argsVal} )`;
    const varObj = grabArgs(schema, operationFields.args, scalarTypes)[1];
    const varsVal = varStrBuild(varObj);
    varsString = `( ${varsVal} )`
    argsObj[operation] = argsVal;
  } else {
    argsString = '';
    varsString = '';
  }

  return `${operationType.toLowerCase()} ${varsString} { ${operation} ${argsString} { ${queryString} } }`
}



/************************** 
***** ADDITIONAL FUNCTIONS 
***************************/

/* determines whether the operation is a query or mutation */
const typeChecker = (schema, operation) => {
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
  if (!operationType) throw new Error(`Operation '${operation}' is not defined in the schema`)
  return [operationType, typeSchema];
}



/* converts custom type text to simple strings */
const typeTrim = type => {
  const typeArr = type.split('');
  const trimArr = [];
  for (let i = 0; i < typeArr.length; i++) {
    if (typeArr[i] !== '[' && typeArr[i] !== ']' && typeArr[i] !== '!') {
      trimArr.push(typeArr[i])
    }
  }
  return trimArr.join('');
}



/* grabFields collects all of the fields associated with a type; if the field is scalar type, it adds to the return object;
if the field is a custom type, the function is invoked again on that field's schema fields continues recursively until only scalar types are found
countOccurrences is used to track the number of times each customType has been called*/
const countOccurrences = (array, val) => {
  return array.reduce((a, v) => (v === val ? a + 1 : a), 0);
}

const grabFields = (schema, customTypeName, customTypeSchema, recursiveBreakArr, scalarTypes) => {
  let returnObj = {};
  for (const key of Object.keys(customTypeSchema)) {
    let typeString = typeTrim(customTypeSchema[key].type.toString());
    if (scalarTypes.includes(typeString)) returnObj[key] = '';
    else {
        recursiveBreakArr.push(typeString);
        if (countOccurrences(recursiveBreakArr, typeString) < 2) {
          returnObj[key] = grabFields(schema, typeString, schema.getType(typeString).getFields(), recursiveBreakArr, scalarTypes);
        }
    }
  }
  return returnObj;
}



/* convert the query/args object to string version; called recursively if there are nested type objs */
const buildString = fieldsObj => {
  const queryArr = [];
  for (const key of Object.keys(fieldsObj)) {
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
const grabArgs = (schema, argsArr, scalarTypes) => {
  const returnArgsObj = {};
  const returnVarsObj = {};
  for (let i = 0; i < argsArr.length; i++) {
    const typeString = typeTrim(argsArr[i].type.toString());
    if (scalarTypes.includes(typeString)) {
      returnArgsObj[argsArr[i].name] = '';
      returnVarsObj[`$${argsArr[i].name}`] = argsArr[i].type.toString();
    } else {
      const nestedFields = grabFields(schema, typeString, schema.getType(typeString).getFields(), [], scalarTypes);
      returnArgsObj[argsArr[i].name] = nestedFields;
      for (const field of Object.keys(nestedFields)) {
        returnVarsObj[`$${field}`] = schema.getType(typeString).getFields()[field].type;
      };
    };
  };
  return [returnArgsObj, returnVarsObj];
};



/* formats the args string into the arg:$arg format */
const argsStrFormatter = str => {
  let strArray = str.split(' ');
  const insIndex = strArray.indexOf('{');
  if (insIndex > 0) {
    for (let i = insIndex + 1; i < strArray.length - 1; i++) {
      strArray[i] = `${strArray[i]}:$${strArray[i]},`
    };
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
const varStrBuild = varObj => {
  const varArr = [];
  for (const key of Object.keys(varObj)) {
    varArr.push(`${key}:`);
    varArr.push(`${varObj[key]},`);
  };
  return varArr.join(' ');
}



module.exports = { queryMap, generateQuery, typeChecker, typeTrim, grabFields, buildString, grabArgs, argsStrFormatter, varStrBuild }
