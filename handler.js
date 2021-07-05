const AWS = require("aws-sdk");
const DynamoDB = require("aws-sdk/clients/dynamodb");
const DocumentClient = new DynamoDB.DocumentClient({ region: 'us-east-1'} );

const isBookAvailable = (book, quantity) => {
  return (book.quantity - quantity) > 0
}

module.exports.checkInventory = async ({ bookId, quantity }) => {
  try{
    let params = {
      TableName: 'bookTable',
      KeyConditionExpression: 'bookId = :bookId',
      ExpressionAttributeValues: {
        ':bookId': bookId
      }
    }

    let result = await DocumentClient.query(params).promise();
    let book = result.Items[0];

    if(isBookAvailable(book, quantity)) {
      return book;
    }
    else {
      let bookOutOfStockError = new Error("The book is out of stock");
      bookOutOfStockError.name = "BookOutOfStock"
      throw bookOutOfStockError;
    }

  }catch(e){
    if(e.name == 'BookOutOfStock'){
      throw e;
    }
    else {
      let bookNotFoundError = new Error(e);
      bookNotFoundError.name = 'BookNotFound';
      throw bookNotFoundError;
    }

  }

};

module.exports.calculateTotal = async ({book, quantity}) => {
  let total = book.price*quantity;
  return {total};
};

const deductPoints = async (userid) => {
  let params = {
    TableName: 'userTable',
    Key: {'userid': userid},
    UpdateExpression: 'SET points = :zero',
    ExpressionAttributeValues: {
      ':zero': 0
    }
  }

  await DocumentClient.update(params).promise();
};

module.exports.redeemPoints = async ({ userid, total}) => {
    let orderTotal = total.total;
    try {
      let params = {
        TableName: 'userTable',
        Key: {
          'userid': userid
        }
      }

      let result = await DocumentClient.get(params).promise();
      let user = result.Item;
      const points = user.points;

      if(orderTotal > points){
        await deductPoints(userid);
        orderTotal = orderTotal-points;
        return {total: orderTotal, points}
      } else {
        throw new Error('Order total is less than redeem points')
      }
  
    
    } catch(e){
      throw new Error(e)
    }
};

module.exports.billCustomer = async (params) => {
  // bill the customers using stripe token from the parameters
  return "sucessfully billed"
}

module.exports.restoreRedeemPoints = async ({userid, total}) => {
  try {
    if(total.points) {
      let params = {
        TableName: 'userTable',
        Key: {userid: userid},
        UpdateExpression: 'set points = :points',
        ExpressionAttributeValues: {
          ':points': total.points
        }
      };

      await DocumentClient.update(params).promise();
    
    }
  }
  catch(e){
    throw new Error(e);
  }
}
