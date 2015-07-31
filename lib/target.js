'use strict';

const childProcess = require('child_process');
const events        = require('events');
const logging       = require('logging.js');
const log           = logging.get('errordog');

function Target(options) {
  if (!(options.name && options.path)) {
    throw new Error('name and path are required');
  }

  this.name       = options.name;
  this.path       = options.path;
  this.thresholds = options.thresholds || [1, 45, 60];
  this.interval   = options.interval   || 60;
  this.freqLimit  = options.freqLimit  || 1000;
  this.match      = options.match      || function(line) { return true; };
  this.ignore     = options.ignore     || function(line) { return false; };
  this.alerters   = options.alerters   || [];
  this.extract    = options.extract    || function(line) { return line; };
  this.emitter    = new events.EventEmitter();
  this.child      = null;
  this.lines      = [];
}

Target.prototype.tail = function() {
  // `tail -F` will keep track changes to the file by filename, instead
  // of using the inode number.This can handle the situation like
  // `logrotation`, and it also keeps trying to open a new file if it's
  // not present.
  var self = this;
  this.child = childProcess.spawn('tail', ['-n', 0, '-F', this.path]);
  this.child.stdout.on('data', function(data) { return self.onData(data); });
  this.child.on('error', function(err) {
    if (err) {
      throw err;
    }
  });
  this.child.on('exit', function(code, signal) {
    if (code !== 0) {
      log.error('child process exit with code %d, signal: %s', code, signal);
    }
  });
  log.info('target %s => tail started', self.name);

  process.on('SIGTERM', function(code) {
    self.child.kill('SIGKILL');
    log.info('target %s => tail stopped', self.name);
    log.info('waiting main process exit..');
    setTimeout(function() {
      process.exit(code);
    }, 100);
  });
};

Target.prototype.watch = function() {
  var self = this;
  setInterval(function() {
    var level = self.thresholds.length - 1;

    while (level >= 0) {
      if ((self.lines.length >= self.thresholds[level]) &&
          (self.lines.length > 0)) {
        self.emitter.emit('alert', level, self.lines);
        break;
      }
      level -= 1;
    }
    self.lines = [];
  }, self.interval * 1e3);
  log.info('target %s => watched (interval: %ds, thresholds: %s)',
           self.name, self.interval, self.thresholds);
};

Target.prototype.connect = function() {
  var self = this;
  self.alerters.forEach(function(item) {
    item.alerter.connect(self, item.settings);
    log.info('target %s & alerter %s => connected',
             self.name, item.alerter.name);
  });
};

Target.prototype.onData = function(data) {
  var lines = data.toString().trim().split('\n');

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (!this.ignore(line) && this.match(line)) {
      this.lines.push(this.extract(line));
    }
  }
};

exports = module.exports = Target;
