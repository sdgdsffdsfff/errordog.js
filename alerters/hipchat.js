// requires module 'request'.
'use strict';

const request = require('request');
const util    = require('util');
const logging = require('logging.js');
const log     = logging.get('errordog.hipchat');

// hipchat api url
var url;

// initialize this alerter with its global settings
exports.init = function(settings) {
  url = ('http://api.hipchat.com/v1/rooms/message' +
         '?format=json&auth_token=%s' + settings.token);
};

exports.connect = function(target, settings) {
  var roomId        = settings.room;
  var from          = settings.from;
  var notify        = settings.notify || true;
  var messageFormat = settings.messageFormat || 'text';
  var atwho         = settings.atwho || [];
  var colors        = ['gray', 'yellow', 'red'];
  var alert         = function(msg, color, code) {
    var form = {
      'room_id': roomId,
      'from'   : from,
      'notify' : +notify,
      'message_format': messageFormat,
      'message': code ? util.format('/code %s', msg): msg,
      'color'  : color || 'gray'
    };
    return request.post({url: url, form: form}, function(err, res, body) {
      if (err)
        log.error('hipchat alerter error: %s', err.stack);
    });
  };

  target.emitter.on('alert', function(level, lines) {
    var color = colors[level];

    if (level == 2 && atwho.length > 0)
      alert(util.format('%s %d errors in %d secs', atwho.join(' '),
                        lines.length, target.interval), color, false);

    if (lines.length > 0)
      alert(lines.join('\n').slice(0, 9900), color, true);
  });
};
