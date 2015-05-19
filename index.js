// Notify you on error logs.
// MIT. Copyright (c) Eleme, Inc.
// https://github.com/eleme/errordog.js
// Only avaliable on Unix(with GNU tail).

'use strict';

const co       = require('co');
const extend   = require('extend');
const fs       = require('fs');
const program  = require('commander');
const logging  = require('logging.js');
const alerters = require('./lib/alerters');
const config   = require('./lib/config');
const util     = require('./lib/util');
const version  = require('./package').version;

const log      = logging.get('errordog');
global.Promise = require('bluebird').Promise;

co(function *() {
  // argv parsing
  program
    .version(version)
    .usage('<service> [options]')
    .option('-c, --config-path <c>', 'config file path')
    .option('-l, --log-level <l>', 'logging level (1~5 for debug~critical)',
           function(val) {return Math.max(Math.min(parseInt(val, 10), 5), 1);})
    .parse(process.argv);

  // init logging
  log.addRule({name: 'stdout', stream: process.stdout,
              level: (program.logLevel || 2) * 10});

  // update default config
  if (typeof program.configPath !== 'undefined') {
    log.debug('load config from %s', program.configPath);
    var content = fs.readFileSync(program.configPath).toString();
    extend(config, eval('var _; _ = ' + content));
  }

  // no service name
  var name = program.args[0];
  if (!name) {
    return program.help();
  }

  // index service
  var service = {
    sentry: require('./lib/sentry'),
    webapp: require('./lib/webapp'),
  }[name];

  if (!service) {
    // invalid service name
    program.help();
  }

  // load alerters
  for (var i = 0; i < config.alerters.length; i++) {
    var list = config.alerters[i];
    var alerter = require(list[0]);
    log.debug("load alerter '%s'", list[0]);
    alerter.init(list[1]);
    alerters[alerter.name] = alerter;
  }

  // yield service
  yield service.serve();
}).catch(function(e) {
  util.fatal(e.stack);
});
