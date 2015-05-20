// Error log watch dog. https://github.com/eleme/errordog.js
// MIT. Copyright (c) 2014 - 20015 Eleme, Inc.
// Only avaliable on Unix(with GNU tail).
// Usage: $ errordog <config>

'use strict';

const extend   = require('extend');
const logging  = require('logging.js');
const program  = require('commander');
const Target   = require('./lib/target');
const util     = require('./lib/util');
const version  = require('./package').version;
const log      = logging.get('errordog');

const stderr   = {
  name: 'stderr',
  stream: process.stderr,
  level: logging.INFO,
};

(function() {
  log.addRule(stderr);

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
  stderr.level = logging[config.logging];

  // init alerters
  config.alerters.forEach(function(item) {
    item.alerter.init(item.settings);
  });

  // watch targets
  config.targets.forEach(function(options) {
    var target = new Target(options);
    target.connect();
    target.tail();
    target.watch();
  });
})();
