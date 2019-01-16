var contract = require('./contract.js');
let Web3 = require('web3');
let util = require('./util.js');
var sleep = require('system-sleep');
let BigNumber = require('bignumber.js');
var mysql = require('mysql');
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

var querySql = 'select * from buy_bird_txn where status=0';
var birdSql = 'update bird set address=?,status=2 where token_id=?';
var birdStatusSql = 'update bird set status=? where token_id=?';
var deleteSql = 'delete from market_bird where bird_token_id =?';
var birdTxnSql = 'update buy_bird_txn set status=2 where id=?';
var updateBirdTxnSql = 'update buy_bird_txn set status=? where id=?';
var birdRecordSql = 'insert into buy_bird_record(bird_id,buyer,seller,hash,price,fee,real_time) values(?,?,?,?,?,?,?)';
var birdRecordExistSql = 'select * from buy_bird_record where hash=?';

while (true) {
  connection.query(querySql, function (err, rows) {
    if (!err) {
      for (var i = 0; i < rows.length; i++) {
        console.log(rows[i].hash);
        var receipt = rows[i].hash;
        var id = rows[i].id;
        (function (receipt, id) {
          web3.eth.getTransactionReceipt(receipt, (err, result) => {
            if (err == null) {
              console.log("eth info: getTransactionReceipt result:" + result);
              if (result == null) {
                //这时候可能在txpool queued队列中，还没打包
                connection.query(updateCatchSql, [1, '', catchId], (err, result) => { console.log(err);});
              } else {
                if (result.logs[0]) {
                  var data = result.logs[0].data;
                  var buyer = data.substring(0, 66);
                  var seller = data.substring(66, 130);
                  var bird_id = data.substring(130, 194);
                  var price = data.substring(194, 258);
                  var fee = data.substring(258, 322);
                  buyer = '0x' + util.format(buyer.substring(2));
                  seller = '0x' + util.format(seller);
                  bird_id = web3.toDecimal('0x' + bird_id.substring(2));
                  price = web3.toDecimal('0x' + price.substring(2));
                  fee = web3.toDecimal('0x' + fee.substring(2));
                  console.log(buyer);
                  console.log(seller);
                  console.log(bird_id);
                  connection.query(birdSql, [buyer, bird_id], (err, result) => {
                    console.log(err);
                    console.log(result);
                    connection.query(deleteSql, [bird_id], (err, result) => {
                      console.log(err);
                      console.log(result);
                      connection.query(birdTxnSql, [id], (err, result) => {
                        console.log(err);
                        console.log(result);
                      });
                      connection.query(birdRecordExistSql, [receipt], (err, rows) => {
                        if (rows.length >= 1) {
                          console.log('buy record exist.hash:' + receipt);
                        } else {
                          connection.query(birdRecordSql, [bird_id, buyer, seller, receipt, price, fee, parseInt(Date.now() / 1000)], (err, result) => {
                            console.log(err);
                            console.log(result);
                          });
                        }
                      });
                    });
                  });
                } else {
                  //todo: 如果log为空，说明智能合约执行失败，这个时候应该获取bird信息，更新bird table
                  connection.query(updateBirdTxnSql, [3, id], (err, result) => {
                    console.log(err);
                    console.log(result);
                  });
                  //bird status应该为2，normal状态
                  connection.query(birdStatusSql, [2, bird_id], (err, result) => {
                    console.log(err);
                    console.log(result);
                  });
                }
              }

            } else {
              connection.query(updateCatchSql, [4, '', catchId], (err, result) => { console.log(err);});
              console.log("eth error: getTransactionReceipt hash:" + receipt + "error:" + e1);
            }
            console.log(err);

          });
        })(receipt, id);
      }
    } else {
      console.log(err);
      connection.end();
    }
  });
  sleep(60000);
}

