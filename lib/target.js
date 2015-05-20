'use strict';

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
}

Target.prototype.watch = function() {

};
