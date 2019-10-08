'use strict';

let path = require('path');
let redis = require('redis');
let config = require(path.join(__dirname, '..', 'config-default.json'));

let dbConfig = config.redis
let RDS_PORT = dbConfig.port     //端口号
let RDS_HOST = dbConfig.host     //服务器IP
let RDS_PWD = dbConfig.pass      //密码
let RDS_OPTS = {auth_pass: RDS_PWD}
let redis_client = redis.createClient(RDS_PORT, RDS_HOST, RDS_OPTS);
redis_client.on('ready',function(res){
    console.log('ready');
	
});

redis_client.on('end',function(err){
    console.log('end');
});

redis_client.on('error', function (err) {
    console.log(err);
});

redis_client.on('connect',function(){
    console.log('redis connect success!');
});
/* 同步获取redis key数据*/
let synGet = async(key)=>{
    let doc = await new Promise( (resolve) => {
        redis_client.get(key,function(err, res){
            return resolve(res);
        });
    });
    return JSON.parse(doc);
}
redis_client.synGet = async(key)=>{
    return await synGet(key);
};


module.exports = redis_client;