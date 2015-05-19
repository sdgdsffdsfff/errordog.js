// Notify you on error logs.
// Copyright (c) Eleme, Inc. <hit9@ele.me>

'use strict';

const co       = require('co');
const program  = require('commander');
const logging  = require('logging.js');
const util     = require('./util');
const version  = require('./package').version;

const log      = logging.get('errordog');
global.Promise = require('bluebird').Promise;

co(function *() {
  // argv parsing
  program
    .version(version)
    .usage('<service> [options]')
    .option('-c, --config-path <c>', 'config file path')
    .option('-s, --sample-config', 'generate sample config file')
    .option('-l, --log-level <l>', 'logging level (1~5 for debug~critical)',
           function(val) {return (parseInt(val, 10) - 1) % 5 + 1;})
    .parse(process.argv);

  // init logging
  log.addRule({name: 'stdout', stream: process.stdout,
              level: (program.logLevel || 2) * 10});
}).catch(function(e) {
  util.fatal(e.stack);
});
