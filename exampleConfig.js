// Example config for https://github.com/eleme/errordog.js,

exports = module.exports = {
  targets: [],
  channels: [
    {
      channel: require('../alerters/console'),
      settings: {},
    }
  ]
};
