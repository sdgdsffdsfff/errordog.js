/**
 * Global Settings
 *   token          hipchat token (required)
 *
 * Target Settings
 *   room           room id (required)
 *   from           message was sent from, default: target.name
 *   notify         should notify users, default: true
 *   messageFormat  messageFormat, default: 'text'
 *   atwho          hipchat ids to `@`, default: []
 */

'use strict';

const request = require('request');
const util    = require('util');
const logging = require('logging.js');
const log     = logging.get('errordog.hipchat');

// hipchat api uri
var uri;

exports.name = 'hipchat';

// Initialize this alerter with dog's config and its global settings
exports.init = function(config, settings) {
  uri = ('http://api.hipchat.com/v1/rooms/message' +
         '?format=json&auth_token=' + settings.token);
};

// Connect this alerter to `target` with this target's `settings`
// for this alerter.
exports.connect = function(target, settings) {
  var roomId        = settings.room;
  var from          = settings.from || target.name;
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
    return request.post({uri: uri, form: form}, function(err, res, body) {
      if (err) {
        log.error('%s', err.stack);
      }
    });
  };

  target.emitter.on('alert', function(level, lines) {
    log.info('%s: alert => level %d, lines: %d',
             target.name, level, lines.length);

    var color = colors[level];

    if (level === 2 && atwho.length > 0) {
      alert(util.format('%s %d errors in last %d secs', atwho.join(' '),
                        lines.length, target.interval), color, false);
    }

    if (lines.length > 0) {
      alert(lines.join('\n').slice(0, 9900), color, true);
    }
  });
};
