// Error log watch dog. https://github.com/eleme/errordog.js
// MIT. Copyright (c) 2014 - 20015 Eleme, Inc.
// Only avaliable on Unix(with GNU tail).

'use strict';

const bluebird = require('bluebird');
const co       = require('co');
const logging  = require('logging.js');
const log      = logging.get('errordog');

global.Promise = bluebird.Promise;
