// Error log watch dog. https://github.com/eleme/errordog.js
// MIT. Copyright (c) 2014 - 20015 Eleme, Inc.
// Only avaliable on Unix(with GNU tail).
//
// Usage:
//
//   $ errordog <config> [<logging-level>]

'use strict';

const logging  = require('logging.js');
const program  = require('commander');
const Target   = require('./lib/target');
const util     = require('./lib/util');
const version  = require('./package').version;
const log      = logging.get('errordog');

log.addRule({name: 'stderr', stream: process.stderr});

(function() {
  // argv parsing
  program
    .version(version)
    .usage('<config> [<logging-level>]')
    .parse(process.argv);

  // require config
  var path = program.args[0];
  if (!path)
    return program.help();

  var config = require(path);

  // logging level
  var levelName = program.args[1] || 'INFO';
  log.getRule('stderr').level = logging[levelName];

  // init alerters
  config.alerters.forEach(function(item) {
    item.alerter.init(config, item.settings);
    log.info('alerter %s => initialized', item.alerter.name);
  });

  // watch targets
  config.targets.forEach(function(options) {
    var target = new Target(options);
    target.connect();
    target.tail();
    target.watch();
  });
})();
