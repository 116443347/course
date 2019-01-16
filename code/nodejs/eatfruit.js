var contract = require('./contract.js');
let Web3 = require('web3');
let util = require('./util.js');
var sleep = require('system-sleep');
let BigNumber = require('bignumber.js');
var mysql = require('mysql');
var connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'bird',
  password: 'b3069797e91a31f7',
  database: 'bird'
});


connection.connect();
let web3;
web3 = new Web3(new Web3.providers.HttpProvider(contract.SERVICE+contract.TOKEN));
let abiArray = contract.ABI;
let contractToke = contract.CONTRACT_HASH;
let MyContract = web3.eth.contract(abiArray);
let contractInstance = MyContract.at(contractToke);
var querySql = 'select * from buy_fruit_txn where status<=1';
var birdStatusSql = 'update bird set status=? where token_id=?';
var birdSql = 'update bird set weight=?,experience=?,power=?,speed=?,level=?,eat_fruit_time=? where token_id=?';
var fruitTxnSql = 'update buy_fruit_txn set status=2 where id=?';
var updateFruitTxnSql = 'update buy_fruit_txn set status=? where id=?';
var fruitRecordExistSql = 'select * from buy_fruit_record where hash=?';
var fruitRecordSql = 'insert into buy_fruit_record(bird_id,fruit_id,address,hash,price,real_time)'
  + 'values(?,?,?,?,?,?)';
while (true) {
  connection.query(querySql, function (err, rows) {
    if (!err) {
      for (var i = 0; i < rows.length; i++) {
        console.log(rows[i].hash);
        var receipt = rows[i].hash;
        var id = rows[i].id;
        var address = rows[i].address;
        (function (receipt, id, address) {
          web3.eth.getTransactionReceipt(receipt, (err, result) => {
            if (err == null) {
              console.log("eth info: getTransactionReceipt result:" + result);
              if (result != null) {
                console.log("eth info: getTransactionReceipt result success, hash:" + receipt + ";result:" + result)
                if (result.logs[0]) {
                  var data = result.logs[0].data;
                  var bird_id = data.substring(66, 130);
                  var fruit_id = web3.toDecimal('0x' + data.substring(130, 194).substring(2));
                  var price = web3.toDecimal('0x' + data.substring(194, 258).substring(2));
                  bird_id = web3.toDecimal('0x' + bird_id.substring(2));
                  console.log('bird_id' + bird_id);
                  contractInstance.getPetInfo.call(bird_id, (err, result) => {
                    console.log(err)
                    console.log(result);
                    if (!err) {
                      var weight = new BigNumber(result[3]).toNumber();
                      var exp = new BigNumber(result[4]).toNumber();
                      var power = new BigNumber(result[5]).toNumber();
                      var speed = new BigNumber(result[6]).toNumber();
                      var level = new BigNumber(result[7]).toNumber();
                      var time = new BigNumber(result[8]).toNumber();
                      connection.query(birdSql, [weight, exp, power, speed, level, time, bird_id], (err, result) => {
                        console.log(err)
                        console.log(result);
                        if (!err) {
                          connection.query(birdStatusSql, [2, bird_id], (err, result) => {
                            console.log(err)
                            console.log(result);
                          });
                          connection.query(fruitTxnSql, [id], (err, result) => {
                            console.log(err)
                            console.log(result);
                          });
                          connection.query(fruitRecordExistSql, [receipt], (err, rows) => {
                            if (rows.length >= 1) {
                              console.log('eat record exist.hash:' + hash);
                            } else {
                              connection.query(fruitRecordSql, [bird_id, fruit_id, address, receipt, price, parseInt(Date.now() / 1000)], (err, result) => {
                                console.log(err)
                                console.log(result);
                              });
                            }
                          });
                        }
                      });
                    }
                  });
                } else {
                  //todo: 如果log为空，说明智能合约执行失败，这个时候应该获取bird信息，更新bird table
                  connection.query(updateFruitTxnSql, [3, id], (err, result) => {
                    console.log(err)
                    console.log(result);
                  });
                  //bird status应该为2，normal状态
                  connection.query(birdStatusSql, [2, bird_id], (err, result) => {
                    console.log(err)
                    console.log(result);
                  });
                }
              } else {
                console.log("eth error: getTransactionReceipt result is null:");
              }
            } else {
              console.log("eth error: getTransactionReceipt hash:" + receipt + "error:" + e1);
            }


          });
        })(receipt, id, address);
      }

    } else {
      console.log(err);
      connection.end();
    }
  });
  sleep(60000);
}

