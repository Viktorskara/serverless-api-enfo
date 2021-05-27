//  IMPORTERA AWS OCH STÄLL IN REGION

const AWS = require('aws-sdk');
AWS.config.update( {
    region: 'eu-north-1'
});


// DEFINIERA DYNAMODB OCH SÖKVÄGAR

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'aktiviteter';
const healthPath ='/health';
const aktivitetPath = '/aktivitet';
const aktiviteterPath = '/aktiviteter';


// CONSTRUCTOR

exports.handler = async function(event) {
    console.log('Request event; ', event);
    let response;
    switch(true) {
        case event.httpMethod === 'GET' && event.path === healthPath:
            response = buildResponse(200);
            break;
         case event.httpMethod === 'GET' && event.path === aktivitetPath:
            response = await getAktivitet(event.queryStringParameters.datum);
            break;
        case event.httpMethod === 'GET' && event.path === aktiviteterPath:
            response = await getAktiviteter();
            break;
        case event.httpMethod === 'POST' && event.path === aktivitetPath:
            response = await addAktivitet(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === aktivitetPath:
            const requestBody = JSON.parse(event.body);
            response = await uppdateraAktivitet(requestBody.datum, requestBody.updateKey, requestBody.updateValue);
            break;
            case event.httpMethod === 'DELETE' && event.path === aktivitetPath:
                response = await deleteAktivitet(JSON.parse(event.body).datum);
                break;
            default:
    }
    return response;
}

//---------------------------------------------------------------------------------------------------METODER----------------------------------------------------------------------------------------------------

// HÄMTA AKTIVITET

async function getAktivitet(datum) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'datum': datum
    }
  }
  
return await dynamodb.get(params).promise().then((response) => {
    return buildResponse(200, response.Item);
  }, (error) => {
    console.error('Misslyckades att hämta aktivitet: ', error);
  });
}

// HÄMTA LISTA AV ALLA AKTIVITETER

async function getAktiviteter() {
  const params = {
    TableName: dynamodbTableName
  }
  const allaAktiviteter = await scanDynamoRecords(params, []);
  const body = {
    Aktiviteter: allaAktiviteter
  }
  return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch(error) {
    console.error('Misslyckades att hämta lista av alla aktiviteter: ', error);
  }
}

// LÄGG TILL EN AKTIVITET

async function addAktivitet(requestBody) {
  const params = {
    TableName: dynamodbTableName,
    Item: requestBody
  }
    return await dynamodb.put(params).promise().then(() => {
    const body = {
      Operation: 'SAVE',
      Message: 'SUCCESS',
      Item: requestBody
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Misslyckades att lägga till en aktivitet: ', error);
  })
}

// UPPDATERA EN AKTIVITET

async function uppdateraAktivitet(datum, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'datum': datum
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ':value': updateValue
    },
    ReturnValues: 'UPDATED_NEW'
  }
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Operation: 'UPDATE',
      Message: 'SUCCESS',
      UpdatedAttributes: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Misslyckades att uppdatera aktivitet: ', error);
  })
}

// TA BORT EN AKTIVITET

async function deleteAktivitet(datum) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'datum': datum
    },
    ReturnValues: 'ALL_OLD'
  }
  return await dynamodb.delete(params).promise().then((response) => {
    const body = {
      Operation: 'DELETE',
      Message: 'SUCCESS',
      Item: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Misslyckades att ta bort aktivitet: ', error);
  })
}



function buildResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Content-Type': 'application/json'
        }, 
        body: JSON.stringify(body)
    }
    
}
