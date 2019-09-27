/**
 * Created by Hongcai Deng on 2015/12/28.
 */

'use strict';

let path = require('path');
let mailin = require('mailin');//Mailin是一个用于监听邮件，解析它们并将它们作为json发送到你所选择的url的smtp服务器
let config = require(path.join(__dirname, '..', 'config-default.json'));

mailin.start(config.mailin);

mailin.on('error', function(err) {
  console.error(err.stack);
});

module.exports = mailin;
