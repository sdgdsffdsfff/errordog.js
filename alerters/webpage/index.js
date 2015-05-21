'use strict';

const http     = require('http');
const logging  = require('logging.js');
const koa      = require('koa');
const mount    = require('koa-mount');
const nunjucks = require('nunjucks');
const path     = require('path');
const route    = require('koa-route');
const static_  = require('koa-static');
const socketio = require('socket.io');
const util     = require('util');

const log      = logging.get('errordog.webpage');
const pstatic  = path.join(__dirname, 'static');
const pview    = path.join(__dirname, 'view');
const loader   = new nunjucks.FileSystemLoader(pview);
const env      = new nunjucks.Environment(loader);
const targets  = [];

var host;   // domain or ip
var port;   // server port
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
      for (var key in params)
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

// @route '/:name' & '/'
var index = function *(name) {
  if (typeof name !== 'string') {
    this.body = yield render('index.html');
  } else {
    this.body = yield render('target.html', {name: name});
  }
};

exports.name = 'webpage';

// initialize this alerter with its global settings
exports.init = function(settings) {
  root = settings.root || '';
  host = settings.host || 'localhost';
  port = settings.port || 9527;
  env.addGlobal('url', url);
  env.addGlobal('path', path);
  env.addGlobal('host', host);
  env.addGlobal('port', port);
  env.addGlobal('root', root);
  env.addGlobal('targets', targets);
  app = koa();
  app.use(mount(url('/static'), static_(pstatic)));
  app.use(route.get(url('/'), index));
  app.use(route.get(url('/:name'), index));
  server = http.createServer(app.callback());
  io = socketio(server);
  server.listen(port);
};

// connect this alerter to `target` with this target's `settings`
// for this alerter.
exports.connect = function(target, settings) {
  targets.push(target);
  var socket = io.of(url('/io/' + target.name));
  target.emitter.on('alert', function(level, lines) {
    socket.emit('data', {
      count: lines.length,
      level: level,
      lines: lines.slice(0, 100),  // max 100 lines
      datetime: new Date().toString(),
      interval: target.interval,
    });
  });
};
