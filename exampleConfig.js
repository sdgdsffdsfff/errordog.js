// Example config for https://github.com/eleme/errordog.js.

exports = module.exports = {
  logging: 'INFO',
  targets: [],
  alerters: [
    {
      alerter: require('./alerters/console'),
      settings: {},
    }
  ]
};
