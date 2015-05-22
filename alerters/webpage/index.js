// Global Settings
//
//    port              web port to bind, default: 9527
//    root              web root url prefix, default: ''
//    workers           workers number, default: 4

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

  // kill child on process exit
  process.on('exit', function() {
    log.info('term worker child process..');
    child.kill('SIGTERM');
  });
};

// connect this alerter to `target` with this target's `settings`
// for this alerter.
exports.connect = function(target, settings) {
  child.send({type: 'connect', target: target, settings: settings});
  target.emitter.on('alert', function(level, lines) {
    child.send({type: 'alert', level: level, lines: lines});
  });
};
