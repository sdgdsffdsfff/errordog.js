'use strict';

const fs = require('fs');

function Target(options) {
  if (!(options.name && options.path))
    throw new Error('name and path are required');

  this.name      = options.name;
  this.path      = options.path;
  this.threshold = options.threshold || 1000;
  this.interval  = options.interval  || 60;
  this.freqLimit = options.freqLimit || 1000;
  this.matches   = options.matches;
  this.ignores   = options.ignores;
  this.alerters  = options.alerters  || [];
  this.extractor = options.extractor ||
    function(line) { return line; };
}

Target.prototype.match = function(line) {
  for (var i = 0; i < this.matches; i++)
    if (line.indexOf(this.matches[i]) >= 0)
      return true;
  return false;
};

Target.prototype.ignore = function(line) {
  for (var i = 0; i < this.ignores; i++)
    if (line.indexOf(this.ignores[i]) >= 0)
      return true;
  return false;
};

Target.fromJSON = function(json) {
  if (json.extractor)
    json.extractor = eval('var _; _ = ' + json.extractor);
  return new Target(json);
};

Target.fromJSONString = function(string) {
  return Target.fromJSON(JSON.parse(string));
};

Target.fromJSONFile = function(file) {
  return Target.fromJSONString(fs.readFileSync(file));
};

exports = module.exports = Target;
