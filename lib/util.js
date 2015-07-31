'use strict';

const logging = require('logging.js');
const log     = logging.get('errordog');

exports.isInt = function(val) {
  return !isNaN(val) && (+val === parseInt(val, 10));
};

exports.fatal = function(err) {
  return log.error('fatal: %s', err) && process.exit(1);
};
