// Example config for https://github.com/eleme/errordog.js.

exports = module.exports = {
  targets: [],
  alerters: [
    {
      alerter: require('./alerters/console'),
      settings: {},
    }
  ]
};
