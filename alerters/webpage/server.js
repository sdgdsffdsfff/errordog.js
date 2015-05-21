'use strict';

const cluster  = require('cluster');
const events   = require('events');
const http     = require('http');
const logging  = require('logging.js');
const koa      = require('koa');
const mount    = require('koa-mount');
const nunjucks = require('nunjucks');
const path     = require('path');
const route    = require('koa-route');
const static_  = require('koa-static');
const sticky   = require('sticky-session');
const socketio = require('socket.io');
const util     = require('util');

const emitter  = new events.EventEmitter();
const log      = logging.get('errordog.webpage');
const pstatic  = path.join(__dirname, 'static');
const pview    = path.join(__dirname, 'view');
const loader   = new nunjucks.FileSystemLoader(pview);
const env      = new nunjucks.Environment(loader);
const targets  = [];

log.addRule({name: 'stderr', stream: process.stderr, level: logging.INFO});

var host;   // domain or ip
var ports;  // server ports
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
      for (var key in params) {
        var list = [key, params[key]];
        var str = list.mao(encodeURIComponent).join('=');
        pairs.push(str);
      }
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

var init = function(settings) {
  ports = settings.ports || [9527];

  if (cluster.isMaster) {
    for (var i = 0; i < ports.length; i++) {
      var worker = cluster.fork();
      worker.send({type: 'init', settings: settings});
      log.info('server worker forked, pid: %d', worker.process.pid);
    }
  } else {
    var port = ports[cluster.worker.id - 1];
    root = settings.root || '';
    host = settings.host || 'localhost';
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
    server.listen(port, function() {
      log.info('server worker %d is listening on %s:%d..',
               cluster.worker.process.pid, host, port);
    });
  }
};

var connect = function(target, settings) {
  if (cluster.isMaster) {
    for (var id in cluster.workers) {
      var worker = cluster.workers[id];
      worker.send({type: 'connect', target: target, settings: settings});
    }
    emitter.on('alert', function(level, lines) {
      // broadcast to workers
      for (var id in cluster.workers) {
        var worker = cluster.workers[id];
        worker.send({type: 'alert', level: level, lines: lines});
      }
    });
  } else {
    targets.push(target);
    var socket = io.of(url('/io/' + target.name));
    emitter.on('alert', function(level, lines) {
      socket.emit('alert', {
        count: lines.length,
        level: level,
        lines: lines.slice(0, 100),  // max 100 lines
        datetime: new Date().toString(),
        interval: target.interval,
      });
    });
  }
};

(function() {
  // if current process is master, recv message from errordog main process
  // if current process is worker, recv message from server master process
  process.on('message', function(msg) {
    switch (msg.type) {
      case 'init':
        init(msg.settings);
        break;
      case 'connect':
        connect(msg.target, msg.settings);
        break;
      case 'alert':
        emitter.emit('alert', msg.level, msg.lines);
        break;
    }
  });
})();
