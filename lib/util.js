'use strict';

const logging = require('logging.js');
const log     = logging.get('errordog');

exports.fatal = function() {
  log.critical.apply(log, arguments);
  process.exit(1);
};

exports.format = require('util').format;
