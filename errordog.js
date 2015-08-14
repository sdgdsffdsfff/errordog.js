/**
 * @fileoverview Error log watch dog. https://github.com/eleme/errordog.js
 * @author Chao Wang (hit9)
 * @copyright MIT. Copyright (c) 2014 - 20015 Eleme, Inc.
 *
 * Only avaliable on Unix(with GNU tail).
 *
 * Usage:
 *
 *   $ errordog <config> [<logging-level>]
 */

'use strict';

const events   = require('events');
const program  = require('commander');
const logging  = require('logging');
const Target   = require('./lib/target');
const util     = require('./lib/util');
const version  = require('./package').version;
const log      = logging.get('errordog');

// may be harmful, see
// http://stackoverflow.com/questions/9768444/possible-eventemitter-memory-leak-detected
events.EventEmitter.defaultMaxListeners = 100;


(function() {
  var path,
      config,
      levelName;

  //---------------------------------------------------------
  // Command line arguments parsing
  //---------------------------------------------------------
  program
  .version(version)
  .usage('<config> [<logging-level>]')
  .parse(process.argv);

  //---------------------------------------------------------
  // Read config
  //---------------------------------------------------------
  path = program.args[0];

  if (!path) {
    return program.help();
  }

  config = require(path);

  //---------------------------------------------------------
  // Configure logging
  //---------------------------------------------------------
  levelName = program.args[1] || 'INFO';
  log.addRule({name: 'stderr', stream: process.stderr});
  log.getRule('stderr').level = logging[levelName.toUpperCase()];

  //---------------------------------------------------------
  // Initialize alerters
  //---------------------------------------------------------
  config.alerters.forEach(function(item) {
    item.alerter.init(config, item.settings);
    log.info("alerter %s => initialized", item.alerter.name);
  });

  //---------------------------------------------------------
  // Initialize targets
  //---------------------------------------------------------
  config.targets.forEach(function(options) {
    var target = new Target(options);
    target.connect();
    target.tail();
    target.watch();
  });
})();
