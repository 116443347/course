var contract = require('./contract.js');

let Web3 = require('web3');
let util = require('./util.js');
var sleep = require('system-sleep');
let BigNumber = require('bignumber.js');

/********************合约 相关定义************************/
let token = '0x3f8dbe56d14af0950703c00ece95591a3eedf73e';
web3 = new Web3(new Web3.providers.HttpProvider(contract.SERVICE));
web3.eth.defaultAccount = token;
let abiArray = contract.ABI;
let contractToke = contract.CONTRACT_HASH;
let MyContract = web3.eth.contract(abiArray);
let contractInstance = MyContract.at(contractToke);
/*********************************************************/

/********************sql 相关定义************************/
var mysql = require('mysql');
var connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'bird',
  password: 'b3069797e91a31f7',
  database: 'bird'
});
var queryCatchSql = 'select * from catch where status<=1';
var updateCatchSql = 'update catch set status=?,trans_receipt=? where id=?';
var insertBirdSql = "insert into bird(genes,birthday,address,weight,experience,power,speed,level,"
  + "status,token_id) values(?,?,?,?,?,?,?,?,0,?)";
var queryBirdSql = 'select * from bird where token_id=?';
var catchRecordSql = 'insert into catch_record(bird_id,address,hash,price,real_time) values(?,?,?,?,?)';
/*********************************************************/

//连接数据库
connection.connect();

//定时执行任务
while (true) {
  connection.query(queryCatchSql, function (err, rows) {
    if (!err) {
      for (var i = 0; i < rows.length; i++) {
        console.log("txn hash:" + rows[i].hash);
        var hash = rows[i].hash;
        var catchId = rows[i].id;
        (function (hash, catchId) {
          web3.eth.getTransactionReceipt(hash, (e1, result) => {
            if (e1 == null) {
              console.log("eth info: getTransactionReceipt result:" + result);
              if (result != null) {
                console.log("eth info: getTransactionReceipt result success, hash:" + receipt + ";result:" + result)
                if (result.logs[0]) {
                  var petId = result.logs[0].data.substring(66, 130);
                  var price = result.logs[0].data.substring(130, 194);
                  var hxPetId = web3.toDecimal('0x' + petId.substring(2));
                  price = web3.toDecimal('0x' + price.substring(2));
                  //获取bird info
                  contractInstance.getPetInfo.call(hxPetId, (e2, result) => {
                    if (!e2) {
                      var address = result[2];
                      var birdInfo = [result[0], new BigNumber(result[1]).toNumber(), address, new BigNumber(result[3]).toNumber(), new BigNumber(result[4]).toNumber(),
                      new BigNumber(result[5]).toNumber(), new BigNumber(result[6]).toNumber(), new BigNumber(result[7]).toNumber(), hxPetId];
                      (function (birdInfo) {
                        connection.query(queryBirdSql, [hxPetId], (e3, rows) => {
                          if (rows.length >= 1) {
                            var params = [2, receipt, catchId];
                            connection.query(updateCatchSql, params, (e11, result) => {
                              if (!e11) {
                                connection.query(catchRecordSql, [hxPetId, address, receipt, price, parseInt(Date.now() / 1000)], (err, result) => {});
                              } else {
                                console.log("db error: update catch table error: " + err);
                              }
                            });
                          } else {
                            connection.query(insertBirdSql, birdInfo, (e12, result) => {
                              if (!e12) {
                                var params = { token_id: hxPetId };
                                var result = util.httpPost(params);
                                
                                var params = [2, receipt, catchId];
                                connection.query(updateCatchSql, params, (e11, result) => {
                                  if (!e11) {
                                    connection.query(catchRecordSql, [hxPetId, address, receipt, price, parseInt(Date.now() / 1000)], (err, result) => {
                                    });
                                  } else {
                                    console.log("db error: update catch table error: " + err);
                                  }
                                });
                              } else {
                                console.log("db error: insert bird table error: " + e12);
                              }
                            });
                          }
                        })
                      })(birdInfo);

                    } else {
                      console.log("eth error: getPetInfo error:" + e2);
                    }

                  });
                } else {
                  console.log(receipt + 'have no result.');
                  connection.query(updateCatchSql, [3, '', catchId], (err, result) => {
                    console.log(err);
                    console.log(result);
                  });
                }
              }
              else {
                console.log("eth error: getTransactionReceipt result is null:");
              }
            } else {
              console.log("eth error: getTransactionReceipt hash:" + receipt + "error:" + e1);
            }
          });
        })(hash, catchId);
      }
    } else {
      console.log("db error: query catch bird status <= 1 error: " + err);
      connection.end();
    }
  });
  sleep(60000);
}

