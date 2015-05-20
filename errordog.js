// Error log watch dog. https://github.com/eleme/errordog.js
// MIT. Copyright (c) 2014 - 20015 Eleme, Inc.
// Only avaliable on Unix(with GNU tail).

'use strict';

const co       = require('co');
const extend   = require('extend');
const logging  = require('logging.js');
const program  = require('commander');
const config   = require('./lib/config');
const util     = require('./lib/util');
const version  = require('./package').version;
const log      = logging.get('errordog');
global.Promise = require('bluebird').Promise;

co(function *() {
  log.addRule({name: 'stderr', stream: process.stderr});
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
  log.getRule('stderr').level = logging[config.logging];
}).catch(function(err) {
  return util.fatal(err);
});
