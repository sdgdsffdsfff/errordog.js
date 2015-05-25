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
const cache    = {};    // {roomName: latest data array}
const loader   = new nunjucks.FileSystemLoader(path.join(__dirname, 'view'));
const env      = new nunjucks.Environment(loader);

var root;       // root url prefix
var rooms;      // all room names
var interval;   // client pull interval
var cacheCount; // cache data count in memory

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

// @route '/:room' & '/'
var index = function *(room) {
  if (typeof room !== 'string') {
    this.body = yield render('index.html');
  } else {
    this.body = yield render('room.html', {
      room: room,
      api: url('/_api/' + room)
    });
  }
  log.info('get %s', this.url);
};

// @route '/_api/:room'
var api = function *(room) {
  var list = cache[room] || [];
  var time = +this.request.query.time || 0;

  list = list.filter(function(data) {
    return time < data.datetime;
  })

  this.body = yield list;

  log.info('get %s => count: %d',
           this.url, list.length);
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
    // reset global vars
    root = settings.root || '';
    rooms = settings.rooms || [];
    interval = settings.interval || 5;
    cacheCount = settings.cacheCount || 30;
    // init env global vars
    env.addGlobal('url', url);
    env.addGlobal('rooms', rooms);
    env.addGlobal('interval', interval);
    // start app
    var port = settings.port || 9527;
    var app = koa();
    app.use(mount(url('/static'), static_(path.join(__dirname, 'static'))));
    app.use(route.get(url('/_api/:room'), api));
    app.use(route.get(url('/'), index));
    app.use(route.get(url('/:room'), index));
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
    var room = settings.room;
    emitter.on('alert', function(name, level, lines) {
      if (name === target.name) {
        var list = cache[room];

        if (typeof list === 'undefined')
          list = cache[room] = [];

        if (list.length > cacheCount)
          list.shift();

        list.push({
          name: target.name,
          count: lines.length,
          level: level,
          lines: lines.slice(0, 60),  // limit 60 lines
          datetime: +new Date(),
          interval: target.interval,
        });
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

  if (cluster.isMaster) {
    // on signal term
    process.on('SIGTERM', function() {
      for (var id in cluster.workers) {
        log.error('process exiting..');
        cluster.workers[id].kill('SIGTERM');
      }
      log.error('cluster master exiting..');
      process.exit(1);
    });
  }
})();
