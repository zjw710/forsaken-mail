/**
 * Created by Hongcai Deng on 2015/12/28.
 */

'use strict';
let path = require('path');
let config = require(path.join(__dirname, '..', 'config-default.json'));

let shortid = require('shortid');//生成无序短ID
let mailin = require('./mailin');
let redis_client = require('./redis');


let onlines = new Map();

module.exports = function(io) {
  mailin.on('message', function(connection, data) {
    let to = data.headers.to.toLowerCase();
    let exp = /[\w\._\-\+]+@[\w\._\-\+]+/i;
    if(exp.test(to)) {
      let matches = to.match(exp);
      let shortid = matches[0].substring(0, matches[0].indexOf('@'));

      addMsgRedis(shortid,data)
      if(onlines.has(shortid)) {
        onlines.get(shortid).emit('mail', data);
      }
    }
  });

  io.on('connection', socket => {
    socket.on('request shortid', function() {
      // onlines.delete(socket.shortid);
      delOnlines(socket.shortid)
      socket.shortid = shortid.generate().toLowerCase(); // generate shortid for a request
      setOnlines(socket.shortid,socket);    
      socket.emit('shortid', socket.shortid);
    });

    socket.on('set shortid', function(id) {
      // onlines.delete(socket.shortid);
      delOnlines(socket.shortid)
      socket.shortid = id;
      setOnlines(socket.shortid,socket)
      socket.emit('shortid', socket.shortid);
    })
    
    socket.on('disconnect', socket => {
      delOnlines(socket.shortid)
      // onlines.delete(socket.shortid);
    });
  });
};
/*
  删除在线连接
*/
function delOnlines(shortid) {
  let key = config.redis.keys.onlinesSet
  onlines.delete(shortid);
  redis_client.srem(key,shortid,function (err, res) {
    console.log("delOnlines success:"+shortid)
    console.log(res)
  })
}
/*
  设置在线连接
*/
function setOnlines(shortid,socket) {
  let key = config.redis.keys.onlinesSet
  onlines.set(shortid, socket);
  redis_client.sadd(key,shortid,function (err, res) {
    console.log("setOnlines success:"+shortid)
    console.log(res)
  })
}
/*
  添加邮件信息到队列中
*/
function addMsgRedis(shortid,val) {
  //对象转字符串
  val = JSON.stringify(val)
  let key = config.redis.keys.msgList+shortid
  redis_client.lpush(key,val,function (err, res) {
    console.log("addMsgRedis success:"+shortid)
    console.log(res)
  })
}