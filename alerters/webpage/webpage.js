'use strict';

const cluster  = require('cluster');
const http     = require('http');
const logging  = require('logging.js');
const koa      = require('koa');
const mount    = require('koa-mount');
const nunjucks = require('nunjucks');
const path     = require('path');
const route    = require('koa-route');
const static_  = require('koa-static');
const socketio = require('socket.io');

const log      = logging.get('errordog.webpage');
const pstatic  = path.join(__dirname, 'static');
const pview    = path.join(__dirname, 'view');
const loader   = new nunjucks.FileSystemLoader(pview);
const env      = new nunjucks.Environment(loader);

var root;   // root url prefix
var app;    // koa app instance
var server; // http server instance
var io;     // socket io instance

// e.g.
//
//   url('/user', {name: 'foo', age: 17})
//   // => '/user?name=foo&age=17'
//
var url = function(route, params) {
    var s = path.join('/', root, route);
    if (params) {
      var pairs = [];
      for (key in params)
        pairs.push([key, params[key]]
                     .map(encodeURIComponent)
                     .join('='));
      s += '?' + pairs.join('&');
    }
    return s;
};

// make nunjucks works with koa
//
var render = function (tpl, ctx) {
  return function(cb) {
    env.render(tpl, ctx, cb);
  }
};

var index = function *(name) {
  this.body = 'hello world';
};

exports.name = 'webpage';

// initialize this alerter with its global settings
exports.init = function(settings) {
  root = settings.root || '';
  env.addGlobal('url', url);
  app = koa();
  app.use(mount(url('/public', pbldir)));
  app.use(mount(url('/:name', index)));
  server = http.createServer(app.callback());
  io = socketio(server);
  server.listen(settings.port || 9527);
};

// connect this alerter to `target` with this target's `settings`
// for this alerter.
exports.connect = function(target, settings) {

};
