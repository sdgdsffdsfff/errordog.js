'use strict';

const child_process = require('child_process');
const events        = require('events');
const extend        = require('extend');
const fs            = require('fs');
const logging       = require('logging.js');
const minimatch     = require('minimatch');
const path          = require('path');
const alerters      = require('./alerters');
const config        = require('./config');
const Target        = require('./target');
const util          = require('./util');

// global constants
const log           = logging.get('errordog.sentry');
const ext           = '.json';
const targets       = {};

// Load `target` from json file.
function load(file) {
  try {
    return Target.fromJSONFile(file);
  } catch(e) {
    log.error("failed to load file '%s', %s", file, e);
  }
}

// Collect targets from directory `workspace`.
function collect() {
  var files = fs.readdirSync(config.workspace)
                .filter(minimatch.filter(
                  util.format('*%s', ext),
                  {matchBase: true}))

  log.info("%d files collected in workspace '%s'",
           files.length, config.workspace);

  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var target = load(file);

    if (!target)
      continue;

    if (target.name in targets) {
      extend(targets[target.name], target);
    } else {
      watch(target) && (targets[target.name] = target);
    }
  }
}

// 'watch' will launch a `child process` to `tail` target's
// `path` and watch its lines frequency, emit `alert` on errors.
//
function watch(target) {
  log.info("start to watch target '%s'", target.name);
  var emitter = new events.EventEmitter();

  // `tail -F` will keep track changes to the file by filename, instead
  // of using the inode number.This can handle the situation like
  // `logrotation`, and it also keeps trying to open a new file if it's
  // not present.
  var child = child_process.spawn('tail', ['-n', 0, '-F', target.path]);

  child.on('error', function(e) {
    if (e)
      log.error('child process error: %s', e);
  });

  child.on('exit', function(code, signal) {
    if (code !== 0)
      log.error("child process of target '%s' exit with code %d, signal '%s'",
               target.name, code, signal);
  });

  child.on('data', function(data) {
    var lines = data.toString().trim().split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (target.ignore(line) || (!target.match(line)))
        continue;
    }
  });

  for (var i = 0; i < target.alerters.length; i++) {
    var list = target.alerters[i];
    var alerter = alerters[list[0]];
    var settings = list[1];

    if (!alerter) {
      log.warn("alerter '%s' not found for target '%s'", list[0], target.name);
      continue;
    }
    alerter.connect(emitter, target, log, settings);
  }
}

exports.serve = function *() {collect();};
