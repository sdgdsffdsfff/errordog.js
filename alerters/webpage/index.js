/**
 * @fileoverview ErrorDog WebPage Main Process.
 *
 * Global Settings
 *
 *    port              web port to bind, default: 9527
 *    root              web root url prefix, default: ''
 *    workers           workers number, default: 4
 *    rooms             rooms list, default: []
 *    interval          client pull interval, default: 5 sec
 *    cacheCount        cache data count in memory, default: 30
 *
 * Target Settings
 *
 *    rooms             rooms to send to
 */

'use strict';

const childProcess  = require('child_process');
const logging       = require('logging.js');
const path          = require('path');
const log           = logging.get('errordog.webpage');

var child;

exports.name = 'webpage';

/**
 * @param {Object} config // errordog config
 * @param {Object} settings // webpage settings
 */
exports.init = function(config, settings) {
  var modulePath,
      args,
      exitServer;

  modulePath = path.join(__dirname, 'server');
  args = [log.getRule('stderr').level];
  child = childProcess.fork(modulePath, args);
  child.send({type: 'initMaster', settings: settings});
  log.info('server master forked, pid: %d', child.pid);

  exitServer = function(code) {
    child.kill('SIGTERM');
    log.info('web server closing..');
    process.exit(code);
  };

  process.on('exit', exitServer);
};

exports.connect = function(target, settings) {
  // send to server master
  child.send({
    type: 'connectMaster',
    target: target,
    settings: settings
  });

  target.emitter.on('alert', function(level, lines) {
    child.send({
      type: 'alertMaster',
      name: target.name,
      level: level,
      lines: lines,
      stamp: +new Date()
    });
  });
};
