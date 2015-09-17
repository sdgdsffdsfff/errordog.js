/**
 * Example config for https://github.com/eleme/errordog.js, you may
 * also want to see example config files at ./example.
 *
 * Global Variables
 *   targets              array of errordog target objects.
 *   alerters             array of errordog alerters (with settings).
 *
 * Target Variables
 *   name                 tagret name, e.g. 'arch.note'. [required]
 *   path                 the path of this target's error log. [required]
 *   interval             time interval (in sec) to check error logs. [default: 60]
 *   thresholds           the thresholds for level 0,1,2 in `interval`. [default: [1, 45, 60]]
 *   extract              function to extract data from native log. [default:
 *                        function(line) {return line}]
 *   alerters             alerters (with settings) for this target. [default: []]
 *   match                function to match a line. [default: function(line) {return true;}]
 *   ignore               function to ignore a line. [defalut: function(line) {return false;}]
 *
 * Hipchat Alerter Global Settings
 *   token                hipchat api token. [required]
 *
 * Hipchat Alerter Target Settings
 *   room                 hipchat room id to send to. [required]
 *   from                 where the message are sent from. [default: {tagret.nmame}]
 *   notify               if set true, hipchat will notify receivers on errors. [default: truea
 *   messageFormat        hipchat message format, one of 'text' and 'html'. [default: 'text']
 *   atwho                the hipchat users to mention on errors. [default: []]
 *   colors               hipchat messages colors on different levels. [default: ['gray', 'yellow', 'red']]
 *
 * Webpage Alerter Global Settings
 *   port                 tcp port to listen. [default: 9527]
 *   root                 the root url prefix, e.g. if your errordog is going to serve on domain.com/sub,
 *                        then you need to set this option to 'sub'. [default: '']
 *   workers              number of workers to start. [default: 4]
 *   rooms                names of all rooms. [default: []]
 *   interval             time interval (in sec) of client updating data. [default: 5]
 *   cacheCount           number of items cached in server memory. [default: 30]
 *
 * Webppage Alerter Target Settings
 *   rooms                names of rooms to send messages. [default: []]
 */


module.exports = {
  targets: [],
  alerters: [
    {
      alerter: require('./alerters/console'),
      settings: {},
    }
  ]
};
