// Global Settings
//
//    port              web port to bind, default: 9527
//    root              web root url prefix, default: ''
//    workers           workers number, default: 4
//    rooms             rooms list, default: []
//    interval          client pull interval, default: 5 sec
//    cacheCount        cache data count in memory, default: 30
//
// Target Settings
//
//    room              room name to send to
//

'use strict';

const child_process = require('child_process');
const logging       = require('logging.js');
const path          = require('path');
const log           = logging.get('errordog.webpage');

var child;  // web server master process

exports.name = 'webpage';

// initialize this alerter with dog's config and its global settings
exports.init = function(config, settings) {
  var numWorkers = settings.numWorkers || 6;
  child = child_process.fork(path.join(__dirname, 'server'));
  child.send({type: 'init', logLevel: config.logging, settings: settings});
  log.info('server master forked, pid %d', child.pid);

  // kill child on process sigterm
  process.on('SIGTERM', function() {
    child.kill('SIGTERM');
    log.error('main process exiting..');
    process.exit(1);
  });
};

// connect this alerter to `target` with this target's `settings`
// for this alerter.
exports.connect = function(target, settings) {
  child.send({type: 'connect', target: target, settings: settings});
  target.emitter.on('alert', function(level, lines) {
    child.send({type: 'alert', name: target.name, level: level, lines: lines,
               stamp: +new Date()});
  });
};
