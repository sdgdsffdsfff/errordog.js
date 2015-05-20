'use strict';

const cluster  = require('cluster');
const http     = require('http');
const koa      = require('koa');
const mount    = require('koa-mount');
const route    = require('koa-route');
const static_  = require('koa-static');
const socketio = require('socket.io');

// root url prefix
var root = '';
// koa app instance
var app;
// http server instance
var server;
// socket io instance
var io;

exports.name = 'webpage';

// initialize this alerter with its global settings
exports.init = function(settings) {
  root = settings.root || '';
  app = koa();
  server = http.createServer(app.callback());
  io = socketio(server);
  server.listen(settings.port || 9527);
};

// connect this alerter to `target` with this target's `settings`
// for this alerter.
exports.connect = function(target, settings) {

};
