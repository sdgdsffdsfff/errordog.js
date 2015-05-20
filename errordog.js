// Error log watch dog. https://github.com/eleme/errordog.js
// MIT. Copyright (c) 2014 - 20015 Eleme, Inc.
// Only avaliable on Unix(with GNU tail).

'use strict';

const co       = require('co');
const extend   = require('extend');
const logging  = require('logging.js');
const program  = require('commander');
const config   = require('./lib/config');
const Target   = require('./lib/target');
const util     = require('./lib/util');
const version  = require('./package').version;
const log      = logging.get('errordog');

global.Promise = require('bluebird').Promise;

const stderr   = {
  name: 'stderr',
  stream: process.stderr,
  level: logging.INFO,
};

co(function *() {
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

  extend(config, require(path));

  // logging level
  stderr.level = logging[config.logging];

  // init alerters
  config.alerters.forEach(function(item) {
    item.alerter.init(item.settings);
  });

  // watch targets
  config.targets.forEach(function(options) {
    var target = new Target(options);
    target.tail(); target.watch();
  });
}).catch(function(err) {
  return util.fatal(err);
});
