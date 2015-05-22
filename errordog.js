// Error log watch dog. https://github.com/eleme/errordog.js
// MIT. Copyright (c) 2014 - 20015 Eleme, Inc.
// Only avaliable on Unix(with GNU tail).
// Usage: $ errordog <config>

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
    .usage('<config>')
    .parse(process.argv);

  // update config
  var path = program.args[0];
  if (!path)
    return program.help();

  var config = require(path);

  // logging level
  log.getRule('stderr').level = logging[config.logging];

  // init alerters
  config.alerters.forEach(function(item) {
    item.alerter.init(config, item.settings);
    log.info('%s => initialized', item.alerter.name);
  });

  // watch targets
  config.targets.forEach(function(options) {
    var target = new Target(options);
    target.connect();
    target.tail();
    target.watch();
  });
})();
