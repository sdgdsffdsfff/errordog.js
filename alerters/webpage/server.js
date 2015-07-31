'use strict';

const cluster   = require('cluster');
const koa       = require('koa');
const mount     = require('koa-mount');
const route     = require('koa-route');
const static_   = require('koa-static');
const logging   = require('logging.js');
const nunjucks  = require('nunjucks');
const path      = require('path');
const version   = require('../../package').version;
const loader    = new nunjucks.FileSystemLoader(path.join(__dirname, 'view'));
const env       = new nunjucks.Environment(loader);
const log       = logging.get('errordog.webpage.server');
const cache     = {};   // {roomName: latestItems}
const globals   = {};   // global vars
const MAX_LINES = 60;

// jshint -W040

function url(route, params) {
  var s = path.join('/', globals.root, route);

  if (params) {
    var pairs = [];

    for (var key in params) {
      var list = [key, params[key]];
      var item = list.map(encodeURIComponent).join('=');
      pairs.push(item);
    }
    s += '?' + pairs.join('&');
  }
  return s;
}


function render(tpl, ctx) {
  return function(cb) {
    return env.render(tpl, ctx, cb);
  };
}

function *index(room) {
  if (typeof room !== 'string') {
    // empty object
    this.body = yield render('index.html');
  } else {
    var data = {room: room, api: url('/_api/' + room)};
    this.body = yield render('room.html', data);
  }
}

function *api(room) {
  var list = cache[room] || [];
  var time = +this.request.query.time || 0;

  list = list.filter(function(data) {
    return time < data.stamp;
  });

  this.body = yield list;
  log.info('%s => %d', this.request.url, list.length);
}


function initMaster(settings) {
  var numWorkers = settings.workers || 4;

  for (var i = 0; i < numWorkers; i++) {
    var worker = cluster.fork();
    worker.send({type: 'initWorker',settings: settings});
    log.info('server master forked worker %d', worker.id);
  }
}


function connectMaster(target, settings) {
  for (var id in cluster.workers) {
    var worker = cluster.workers[id];
    worker.send({type: 'connectWorker', target: target, settings: settings});
  }
}


function alertMaster(name, level, lines, stamp) {
  for (var id in cluster.workers) {
    var worker = cluster.workers[id];
    worker.send({type: 'alertWorker', name: name, level: level, lines: lines,
                stamp: stamp});
  }
}


function mainMaster() {
  process.on('message', function(msg) {
    switch(msg.type) {
      case 'initMaster':
        return initMaster(msg.settings);
      case 'connectMaster':
        return connectMaster(msg.target, msg.settings);
      case 'alertMaster':
        return alertMaster(msg.name, msg.level, msg.lines, msg.stamp);
    }
  });
}

function initWorker(settings) {
  var root = globals.root = settings.root || '';
  var rooms = globals.rooms = settings.rooms || [];
  var interval = globals.interval = settings.interval || 5;
  var cacheCount = globals.cacheCount = settings.cacheCount || 30;
  var port = globals.port = settings.port || 9527;

  env.addGlobal('version', version);
  env.addGlobal('url', url);
  env.addGlobal('rooms', rooms);
  env.addGlobal('interval', interval);

  var app = koa();

  app.use(mount(url('/static'), static_(path.join(__dirname, 'static'))));
  app.use(route.get(url('/_api/:room'), api));
  app.use(route.get(url('/'), index));
  app.use(route.get(url('/:room'), index));

  app.listen(port, function() {
    log.info('server worker started on port %d', port);
  });
  log.debug('server worker initialized');
}


function connectWorker(target, settings) {
  if (!('_maps' in globals)) {
    globals._maps = {};
  }

  globals._maps[target.name] = {
    target: target,
    settings: settings,
  };
  log.debug('server worker registered with %s', target.name);
}


function alertWorker(name, level, lines, stamp) {
  if (!(name in globals._maps)) {
    return;
  }

  var interval = globals._maps[name].target.interval;
  var rooms = globals._maps[name].settings.rooms;

  for (var i = 0; i < rooms.length; i++) {
    var room = rooms[i];
    var list = cache[room];

    if (typeof list === 'undefined') {
      list = cache[room] = [];
    }

    if (list.length > globals.cacheCount) {
      list.shift();
    }

    var data = {
      name: name,
      count: lines.length,
      level: level,
      lines: lines.slice(0, MAX_LINES),
      stamp: stamp,
      interval: interval,
    };

    list.push(data);
  }

  log.debug('server worker alert, name: %s, count: %d, level: %d, stamp: %d',
          data.name, data.count, data.level, data.stamp);
}


function mainWorker() {
  process.on('message', function(msg){
    switch(msg.type) {
      case 'initWorker':
        return initWorker(msg.settings);
      case 'connectWorker':
        return connectWorker(msg.target, msg.settings);
      case 'alertWorker':
        return alertWorker(msg.name, msg.level, msg.lines, msg.stamp);
    }
  });
}

(function() {
  // init logger
  log.addRule({
    name: 'stderr',
    stream: process.stderr,
    level: +process.argv[2]
  });

  if (cluster.isMaster) {
    mainMaster();
  } else if (cluster.isWorker) {
    mainWorker();
  }
})();
