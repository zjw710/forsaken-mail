/**
 * Created by Hongcai Deng on 2015/12/28.
 */

'use strict';
let path = require('path');
let config = require(path.join(__dirname, '..', 'config-default.json'));

let shortid = require('shortid');//生成无序短ID
let mailin = require('./mailin');
let util = require('./util');
let redis_client = require('./redis');


let onlines = new Map();

module.exports = function(io) {
  mailin.on('message', function(connection, data) {
    console.log("get message:")
    console.log(data)
    let to = data.headers.to.toLowerCase();
    /* 检查发送或接收的邮件地址是否在黑名单,如果在黑名单,则抛弃消息*/
    if (!checkAddr(data)) {
      return
    }

    let exp = /[\w\._\-\+]+@[\w\._\-\+]+/i;
    if(exp.test(to)) {
      let matches = to.match(exp);
      let shortid = matches[0].substring(0, matches[0].indexOf('@'));
      //记录消息
      addMsgRedis(shortid,data)
      //统计邮箱对应消息数量
      addMsgCount(shortid)
      if(onlines.has(shortid)) {
        onlines.get(shortid).emit('mail', data);
      }
    }
  });

  io.on('connection', socket => {
    socket.on('request shortid', function(m_id) {      
      // onlines.delete(socket.shortid);      
      delOnlines(socket.shortid)
      socket.shortid = shortid.generate().toLowerCase(); // generate shortid for a request
      setOnlines(socket.shortid,socket,m_id);    
      socket.emit('shortid', socket.shortid);
    });
    /**
    data格式为:{shortid:123456,m_id:1}
    */
    socket.on('set shortid', function(data) {
      // onlines.delete(socket.shortid);
      delOnlines(socket.shortid)
      socket.shortid = data.shortid;//id;
      setOnlines(socket.shortid,socket,data.m_id)
      socket.emit('shortid', socket.shortid);
    })
    
    socket.on('disconnect', function() {
      console.log("disconnect:")
      console.log("socket.shortid:"+socket.shortid)
      delOnlines(socket.shortid)
      // onlines.delete(socket.shortid);
    });
  });
};
/*
  删除在线连接
*/
function delOnlines(shortid) {
  console.log("delOnlines:")
  if (!shortid || shortid === 'undefined') {
    console.log("shortid="+shortid)
    return
  }
  let key = config.redis.keys.onlines+shortid
  onlines.delete(shortid);
  redis_client.del(key,function (err, res) {
    console.log("delOnlines success:"+shortid)
    console.log(res)
  })
}
/*
  设置在线连接
*/
function setOnlines(shortid,socket,m_id) {
  console.log("setOnlines:")
  if (!shortid || shortid === 'undefined') {
    console.log("shortid="+shortid)
    return
  }
  let key = config.redis.keys.onlines+shortid
  onlines.set(shortid, socket);
  redis_client.set(key,m_id,function (err, res) {
    console.log("setOnlines success:"+shortid)
    console.log(res)
  })
  let expire_time = 1800//一个连接只保存30分钟
  redis_client.expire(key,expire_time)
}
/*
  添加邮件信息到队列中
*/
function addMsgRedis(shortid,data) {

  //对象转字符串
  let val = {
    from_name:data.from[0].name,
    from:data.from[0].address,
    to:data.to[0].address,
    subject:data.subject,
    text:data.text,
    recvDate:util.formatTime(Date.parse(data.receivedDate)),
    html:data.html
  }
  val = JSON.stringify(val)
  let key = config.redis.keys.msgList+shortid
  redis_client.lpush(key,val,function (err, res) {
    console.log("addMsgRedis success:"+shortid)
    console.log(res)
  })
  //裁剪数据
  redis_client.ltrim(key,0,10,function (err, res) {
    console.log("ltrimMsgRedis success:"+shortid)
    console.log(res)
  })

  let expire_time = 1200//只保存20分钟
  redis_client.expire(key,expire_time)
}
/* 添加接收邮件统计 */
function addMsgCount(shortid) {
  let key = config.redis.keys.msgCount+util.formatDate(new Date())
  redis_client.zincrby(key,1,shortid,function (err,res) {
    console.log("addMsgCount shortid:"+shortid)
  })
}
/* 检查邮件地址 */
function checkAddr(data) {
  let from = data.from[0]['address'].toLowerCase();    
  let to = data.to[0]['address'].toLowerCase();  
  if(!checkFromAddr(from)){
    return false
  }
  if (!checkToAddr(to)) {
    return false
  }
}
/* 检查发送邮件地址是否在黑名单 */
function checkFromAddr(addr) {
  //获取邮箱地址黑名单
  let key = config.redis.keys.stopFromAddr
  let res redis_client.get(key)
  let stopAddrArr = JSON.parse(res);
  console.log("checkFromAddr stopAddrArr:"+addr)
  console.log(stopAddrArr)
  if (stopAddrArr.indexOf(addr) > -1) {
    console.log("checkFromAddr false!")
    return false
  }else{
    console.log("checkFromAddr true!")
    return true
  }
}
/* 检查接收邮件地址是否在黑名单 */
function checkToAddr(addr) {
  //获取邮箱地址黑名单
  let key = config.redis.keys.stopToAddr
  let res redis_client.get(key)
  let stopAddrArr = JSON.parse(res);
  console.log("checkToAddr stopAddrArr:"+addr)
  console.log(stopAddrArr)
  if (stopAddrArr.indexOf(addr) > -1) {
    console.log("checkToAddr false!")
    return false
  }else{
    console.log("checkToAddr true!")
    return true
  }
}