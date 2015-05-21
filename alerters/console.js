'use strict';

exports.name = 'console';

// initialize this alerter with dog's config and its global settings
exports.init = function(config, settings) {};

// connect this alerter to `target` with this target's `settings`
// for this alerter.
exports.connect = function(target, settings) {
  target.emitter.on('alert', function(level, lines) {
    console.log(lines.join('\n'));
  });
};
