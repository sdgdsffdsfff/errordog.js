'use strict';

const cluster  = require('cluster');
const events   = require('events');
const logging  = require('logging.js');
const koa      = require('koa');
const mount    = require('koa-mount');
const nunjucks = require('nunjucks');
const path     = require('path');
const route    = require('koa-route');
const static_  = require('koa-static');
const util     = require('util');

const emitter  = new events.EventEmitter();
const log      = logging.get('errordog.webpage');
const targets  = {};
const cache    = {};
const loader   = new nunjucks.FileSystemLoader(path.join(__dirname, 'view'));
const env      = new nunjucks.Environment(loader);

// root url prefix
var root;

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
        var str = list.map(encodeURIComponent).join('=');
        pairs.push(str);
      }
      s += '?' + pairs.join('&');
    }
    return s;
};

// make nunjucks works with koa
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
    this.body = yield render('target.html', {
      name: name,
      target: targets[name],
      api: url('/_api/' + name)
    });
  }
  log.info('get %s', this.url);
};

// @route '/_api/:name'
var api = function *(name) {
  var res = cache[name] || {updateAt: 0, level: null, count: null};
  this.body = yield res;

  log.info('get %s => level: %s, count: %s, updateAt: %d',
           this.url, res.level, res.count, res.updateAt);
};

var init = function(logLevel, settings) {
  // we are in child process(worker/matser), not in dog's process
  // logging's propagate is not working here, for two copies memory
  // are separate.
  log.addRule({name: 'stderr', stream: process.stderr, level: logging[logLevel]});

  if (cluster.isMaster) {
    var numWorkers = settings.workers || 4;
    for (var i = 0; i < numWorkers; i++) {
      var worker = cluster.fork();
      worker.send({type: 'init', logLevel: logLevel, settings: settings});
      log.info('server worker forked, pid: %d', worker.process.pid);
    }
  } else {
    // reset global `root`
    root = settings.root || '';
    // init env global vars
    env.addGlobal('Object', Object);
    env.addGlobal('url', url);
    env.addGlobal('targets', targets);
    // start app
    var port = settings.port || 9527;
    var app = koa();
    app.use(mount(url('/static'), static_(path.join(__dirname, 'static'))));
    app.use(route.get(url('/_api/:name'), api));
    app.use(route.get(url('/'), index));
    app.use(route.get(url('/:name'), index));
    app.listen(port, function() {
      log.info('server worker started on port %d..', port);
    });
  }
};

var connect = function(target, settings) {
  if (cluster.isMaster) {
    for (var id in cluster.workers) {
      var worker = cluster.workers[id];
      worker.send({type: 'connect', target: target, settings: settings});
    }
    emitter.on('alert', function(name, level, lines) {
      // broadcast to workers
      for (var id in cluster.workers) {
        var worker = cluster.workers[id];
        worker.send({type: 'alert', name: name, level: level, lines: lines});
      }
    });
  } else {
    // record this target;
    targets[target.name] = target;

    emitter.on('alert', function(name, level, lines) {
      if (name === target.name) {
        cache[target.name] = {
          count: lines.length,
          level: level,
          lines: lines.slice(0, 60),  // limit 60 lines
          updateAt: +new Date(),
          interval: target.interval,
        };
      }
    });
  }
};

(function() {
  // if current process is master, recv message from errordog main process
  // if current process is worker, recv message from server master process
  process.on('message', function(msg) {
    switch (msg.type) {
      case 'init':
        init(msg.logLevel, msg.settings);
        break;
      case 'connect':
        connect(msg.target, msg.settings);
        break;
      case 'alert':
        emitter.emit('alert', msg.name, msg.level, msg.lines);
        break;
    }
  });
})();
