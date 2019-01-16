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
var querySql = 'select * from bird_pk_txn where status<=1';
var birdStatusSql = 'update bird set status=? where token_id=?';
var birdSql = 'update bird set status=2,weight=?,experience=?,power=?,speed=?,level=? where token_id=?';
var recordSql = 'insert into bird_pk_record(challengerId,resisterId,isWin,' +
  'challengerRewardExp,resisterRewardExp,winnerRewardCoin,hash,real_time) values(?,?,?,?,?,?,?,?)';
var recordExistSql = 'select * from bird_pk_record where hash=?';
var birdTxnSql = 'update bird_pk_txn set status=2 where id=?';
var updateBirdTxnSql = 'update bird_pk_txn set status=? where id=?';
while (true) {
  connection.query(querySql, function (err, rows) {
    if (!err) {
      for (var i = 0; i < rows.length; i++) {
        console.log(rows[i].hash);
        var receipt = rows[i].hash;
        var id = rows[i].id;
        var challengerId = rows[i].challengerId;
        var resisterId = rows[i].resisterId;
        (function (receipt, id, challengerId, resisterId) {
          web3.eth.getTransactionReceipt(receipt, (err, result) => {
            if (err == null) {
              console.log("eth info: getTransactionReceipt result:" + result);
              if (result != null) {
                console.log("eth info: getTransactionReceipt result success, hash:" + receipt + ";result:" + result)
                if (result.logs[0]) {
                  var data = result.logs[0].data;
                  var challengerAddress = data.substring(0, 66);
                  console.log(challengerAddress);
                  var isWin = web3.toDecimal('0x' + data.substring(194, 258).substring(2));
                  var exp1 = web3.toDecimal('0x' + data.substring(258, 322).substring(2));
                  var exp2 = web3.toDecimal('0x' + data.substring(322, 386).substring(2));
                  var deltaCoin = web3.toDecimal('0x' + data.substring(386, 450).substring(2));
                  console.log(challengerAddress + '--' + challengerId + '--' + resisterId + '--' + isWin + '--' + exp1 + '--' + exp2 + '--' + deltaCoin);

                  contractInstance.getPetInfo.call(challengerId, (err, result) => {
                    if (!err) {
                      connection.query(birdSql, [new BigNumber(result[3]).toNumber(), new BigNumber(result[4]).toNumber(), new BigNumber(result[5]).toNumber(), new BigNumber(result[6]).toNumber(), new BigNumber(result[7]).toNumber(), challengerId], (err, result) => {
                        console.log(err);
                        console.log(result);
                      });
                    }
                  });
                  contractInstance.getPetInfo.call(resisterId, (err, result) => {
                    if (!err) {
                      connection.query(birdSql, [new BigNumber(result[3]).toNumber(), new BigNumber(result[4]).toNumber(), new BigNumber(result[5]).toNumber(), new BigNumber(result[6]).toNumber(), new BigNumber(result[7]).toNumber(), resisterId], (err, result) => {
                        console.log(err);
                        console.log(result);
                      });
                    }
                  });
                  connection.query(recordExistSql, [receipt], (err, rows) => {
                    if (rows.length >= 1) {
                      console.log('pk record exist.hash:' + receipt);
                    } else {
                      connection.query(recordSql, [challengerId, resisterId, isWin, exp1, exp2, deltaCoin, receipt, parseInt(Date.now() / 1000)], (err, result) => {
                        console.log(err);
                        console.log(result);
                      });
                    }
                  });

                  connection.query(birdTxnSql, [id], (err, result) => {
                    console.log(err);
                    console.log(result);

                  });
                } else {
                  console.log('pending....')
                  connection.query(birdStatusSql,[2,challengerId],(err,result) => {
                    console.log(err);
                    console.log(result);
                  });
                  connection.query(birdStatusSql,[2,resisterId],(err,result) => {
                    console.log(err);
                    console.log(result);
                  });
                  
                  connection.query(birdTxnSql, [3, id], (err, result) => {
                    console.log(err);
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
        })(receipt, id, challengerId, resisterId);
      }
    } else {
      console.log(err);
      connection.end();
    }
  });
  sleep(60000);
}

