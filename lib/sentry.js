'use strict';

const child_process = require('child_process');
const events        = require('events');
const extend        = require('extend');
const fs            = require('fs');
const logging       = require('logging.js');
const minimatch     = require('minimatch');
const path          = require('path');
const config        = require('./config');

// global constants
const log           = logging.get('errordog.sentry');
const ext           = '.json';
// {filename: target}
const targets       = {};

// make `target` from json `file`.
//
//  * return `undefined` on failure.
//  * return `target` on success.
//
function make(file) {
  var content = fs.readFileSync(file);
  var target = JSON.parse(content);
  var name = path.basename(file, ext);

  if (!target.path)
    // `path` is required.
    return;

  if (!target.name) {
    target.name = name;
  } else if (target.name !== name) {
    // `name` should the same with `target.name`
    return;
  }

  return target;
}

// normalize `target`.
//
function normalize(target) {
  // frequencyLimit
  target.frequencyLimit = target.frequencyLimit || 1000;

  // extractor
  if (target.extractor) {
    target.extractor = eval('var _; _ = ' + target.extractor);
  } else {
    log.debug('using default extractor for %s', target.name);
    target.extractor = function(line) { return line; };
  }

  // match
  if (target.matches) {
    target._match = function(line) {
      for (var i = 0; i < target.matches.length; i++)
        if (line.indexOf(target.matches[i]) >= 0)
          return true;
      return false;
    };
  }

  // ignore
  if (target.ignores) {
    target._ignore = function(line) {
      for (var i = 0; i < target.ignores.length; i++)
        if (line.indexOf(target.ignores[i]) >= 0)
          return true;
      return false;
    };
  }
}

// load targets from directory `workspace`:
//
//  * if some `file` cannot be load, skip it.
//  * if some `file` is new, watch it.
//  * if some `file` is already load, update it.
//
function load() {
  log.debug('load targets from %s', config.workspace);
  var files = fs.readdirSync(config.workspace)
                .filter(minimatch.filter('*' + ext, {
                  matchBase: true}));
  log.debug('%d files collected', files.length);

  for (var i = 0; i < files.length; i++) {
    var file = files[i];

    var target;
    try {
      target = make(file);
    } catch(e) {
      // load on error, skip it
      log.warn('failed to load %s, %s', file, e);
      continue;
    }

    if (typeof target === 'undefined') {
      // invalid target, skip it
      log.warn('invalid target %s', file);
      continue;
    }

    if (target.name in targets) {
      // update it
      extend(targets[target.name], target);
    } else {
      // watch and add it to `targets`
      watch(normalize(target));
      targets[target.name] = target;
    }
  }
}

// watch a target.
// `watch` will lanch a `child process` to `tail`
// target's `path`, and watch its lines frequency, emits
// `'alert'` on errors.
//
function watch(target) {
  log.info('watch target %s', target.name);

  var emitter = new events.EventEmitter();

  // `tail -F` will keep track changes to the file by filename, instead
  // of using the inode number.This can handle the situation like
  // `logrotation`, and it also keeps trying to open a new file if it's
  // not present.
  var child = child_process.spawn('tail', ['-n', 0, '-F', target.path]);

  child.on('error', function(e) {
    // rewatch on 'error'
    if (e) {
      log.error('child process error %s', e);
    }
  });

  child.on('exit', function(code, signal) {
    log.warn('child process of target %s exit with code %d',
             target.name, code);
  });

  child.stdout.on('data', function(data) {
    var lines = data.toString().trim().split('\n');

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];

      if (target._ignore && target._ignore(line))
        continue;

      if (target._match && !target._match(line))
        continue;

      // check indensity
    }
  });
}

exports.serve = function *() {
  load();
};
