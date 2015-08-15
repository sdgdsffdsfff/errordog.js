/**
 * @fileoverview ErrorDog WebPage Web Server.
 *
 */

'use strict';

const clone     = require('clone');
const cluster   = require('cluster');
const extend    = require('extend');
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


/**
 * Util to join url route with request params.
 *
 *  @param {String} route
 *  @param {Object} params
 *  @return {String}
 */
function url(route, params) {
  var s,
      pairs,
      key,
      list,
      item;

  if (typeof params === 'undefined') {
    params = {};
  }

  s = path.join('/', globals.root, route);

  if (params) {
    pairs = [];

    for (key in params) {
      list = [key, params[key]];
      item = list.map(encodeURIComponent).join('=');
      pairs.push(item);
    }
    s += '?' + pairs.join('&');
  }
  return s.replace(/\?$/g, '');
}


/**
 * Render ``ctx`` with ``tpl``.
 *
 * @param {String} tpl // template filename
 * @param {Object} ctx // render context
 * @return {String}
 */
function render(tpl, ctx) {
  return function(cb) {
    return env.render(tpl, ctx, cb);
  };
}

/**
 * @route index '/{room}'
 * @param {String} room
 */
function *index(room) {
  var params = {
    lang: this.request.query.lang === 'zh' ? 'zh' : 'en'
  };

  if (typeof room !== 'string' && !Object.keys(room).length
      && globals.rooms.length) {
    room = globals.rooms[0];
  }

  this.body = yield render('index.html', {
    room: room,
    api: url('/_api/' + room),
    params: params
  });
}

/**
 * @route api '/_api/{room}'
 * @param {String} room
 */
function *api(room) {
  var list,
      time;

  list = cache[room] || [];
  time = +this.request.query.time || 0;

  list = list.filter(function(data) {
    return time < data.stamp;
  });

  this.body = yield list;
  log.info("%s => %d", this.request.url, list.length);
}

/**
 * Init web master and fork workers
 *
 * @param {Object} settings // main webpage settings
 */
function initMaster(settings) {
  var numWorkers, i, worker;

  numWorkers = settings.workers || 4;

  for (i = 0; i < numWorkers; i++) {
    worker = cluster.fork();
    worker.send({
      type: 'initWorker',
      settings: settings
    });
    log.info("server master forked worker %d", worker.id);
  }
}

/**
 * Connect web master with ``target`` and ``settings``.
 *
 * @param {String} target
 * @param {Object} settings
 */
function connectMaster(target, settings) {
  var id, worker;

  for (id in cluster.workers) {
    worker = cluster.workers[id];
    worker.send({
      type: 'connectWorker',
      target: target,
      settings: settings
    });
  }
}

/**
 * Alert work in master with on ``alert`` event.
 *
 * @param {String} name
 * @param {Number} level
 * @param {Array} lines
 * @param {Number} stamp
 */
function alertMaster(name, level, lines, stamp) {
  var id, worker;

  for (id in cluster.workers) {
    worker = cluster.workers[id];
    worker.send({
      type: 'alertWorker',
      name: name,
      level: level,
      lines: lines,
      stamp: stamp
    });
  }
}


/**
 * Dispatch works on different messages in master.
 */
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

/**
 * Init worker with settings, including render and koa initializations.
 *
 * @param {Object} settings
 */
function initWorker(settings) {
  var root = globals.root = settings.root || '';
  var rooms = globals.rooms = settings.rooms || [];
  var interval = globals.interval = settings.interval || 5;
  var cacheCount = globals.cacheCount = settings.cacheCount || 30;
  var port = globals.port = settings.port || 9527;

  env.addGlobal('url', url);
  env.addGlobal('clone', clone);
  env.addGlobal('extend', extend);
  env.addGlobal('version', version);
  env.addGlobal('rooms', rooms);
  env.addGlobal('interval', interval);

  var app = koa();

  app.use(mount(url('/static'), static_(path.join(__dirname, 'static'))));
  app.use(route.get(url('/_api/:room'), api));
  app.use(route.get(url('/'), index));
  app.use(route.get(url('/:room'), index));

  app.listen(port, function() {
    log.info("server worker started on port %d", port);
  });

  log.debug("server worker initialized");
}

/**
 * Connect work in worker.
 *
 * @param {Target} target
 * @param {Object} settings
 */
function connectWorker(target, settings) {
  if (!('_maps' in globals)) {
    globals._maps = {};
  }

  globals._maps[target.name] = {
    target: target,
    settings: settings,
  };
  log.debug("server worker registered with %s", target.name);
}


/**
 * Alert work in worker.
 *
 * @param {String} name
 * @param {Number} level
 * @param {Array} lines
 * @param {Number} stamp
 */
function alertWorker(name, level, lines, stamp) {
  var interval,
      rooms,
      room,
      list,
      data,
      i;

  if (!(name in globals._maps)) {
    return;
  }

  interval = globals._maps[name].target.interval;
  rooms = globals._maps[name].settings.rooms;

  data = {
    name: name,
    count: lines.length,
    level: level,
    lines: lines.slice(0, MAX_LINES),
    stamp: stamp,
    interval: interval,
  };


  for (i = 0; i < rooms.length; i++) {
    room = rooms[i];
    list = cache[room];

    if (typeof list === 'undefined') {
      list = cache[room] = [];
    }

    if (list.length > globals.cacheCount) {
      list.shift();
    }

    list.push(data);
  }

  log.debug("server worker alert, name: %s, count: %d, level: %d, stamp: %d",
            data.name, data.count, data.level, data.stamp);
}

/**
 * Dispatch works on different messages in master.
 */
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
