'use strict';

var child_process = require('child_process');
var events        = require('events');

function Target(options) {
  if (!(options.name && options.path))
    throw new Error('name and path are required');
  this.name       = options.name;
  this.path       = options.path;
  this.threshold  = options.threshold || 1000;
  this.interval   = options.interval  || 60;
  this.freqLimit  = options.freqLimit || 1000;
  this.match      = options.match;
  this.ignore     = options.ignore;
  this.channels   = options.channels || [];
  this.extract    = options.extract || function(line) { return lines; }
  this.emitter    = new events.EventEmitter();
}

Target.prototype.watch = function() {

};

Target.prototype.connect = function() {
  var self = this;
  self.channels.forEach(function(item) {
    item.channel.connect(self, item.settings);
  });
};
