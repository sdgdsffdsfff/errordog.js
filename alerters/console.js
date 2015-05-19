'use strict';

exports.name = 'console';

// register this alerter for `target` with `settings`.
exports.register = function(emitter, target, log, settings) {
  emitter.on('alert', function(level, lines, extra) {
    console.log(lines.join('\n'));
  });
};
