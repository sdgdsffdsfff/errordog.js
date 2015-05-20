'use strict';

// initialize this alerter with its global settings
exports.init = function(settings) {};

// connect this alerter to `target` with this target's `settings`
// for this alerter.
exports.connect = function(target, settings) {
  target.emitter.on('data', function(level) {
    console.log(lines.join('\n'));
  });
};
