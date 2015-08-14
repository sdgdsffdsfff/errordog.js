'use strict';

exports.name = 'console';

/**
 * Initialize this alerter with dog's config and its global settings
 */
exports.init = function(config, settings) {};

/**
 * Connect this alerter to `target` with this target's `settings`
 * for this alerter.
 */
exports.connect = function(target, settings) {
  target.emitter.on('alert', function(level, lines) {
    console.log(lines.join('\n'));
  });
};
