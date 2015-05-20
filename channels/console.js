'use strict';

// initialize this alerter with its global settings
exports.init = function(settings) {};

// connect this alerter to `target` with this target's `settings`
// for this alerter.
exports.connect = function(emitter, target, log, settings) {
  emitter.on('alert', function(level, lines, extra) {
    console.log(lines.join('\n'));
  });
};
