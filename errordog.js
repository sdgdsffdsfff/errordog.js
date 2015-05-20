// Error log watch dog. https://github.com/eleme/errordog.js
// MIT. Copyright (c) 2014 - 20015 Eleme, Inc.
// Only avaliable on Unix(with GNU tail).

'use strict';

const bluebird = require('bluebird');
const co       = require('co');
const logging  = require('logging.js');
const minimist = require('minimist');
const errors   = require('./lib/errors');
const util     = require('./lib/util');

const log      = logging.get('errordog');

const stderr   = {
  name   : 'stderr',
  stream : process.stderr,
  level  : logging.INFO
};

global.Promise = bluebird.Promise;

co(function *() {
  log.addRule(stderr);

  // argv parsing
  var argv = minimist(process.argv.slice(2));

  if (argv._.length == 0)
    throw new errors.InvalidArgs('requires config path');

  if (typeof argv.l !== 'undefined') {
    if (!isInt(argv.l) || argv.l < 1 || argv.l > 5)
        throw new errors.InvalidArgs(
          'log level should be an integer (1~5).');
    stderr.level = 10 * argv.l;
  }

  // require `config`
  var path = argv._[0];
}).catch(function(err) {
  if (err instanceof errors.ErrDogError) {
    log.error(err.message);
    if (err instanceof errors.FatalError)
      process.exit(err.code);
  } else {
    log.error(err.stack);
    process.exit(0xe0);
  }
});
