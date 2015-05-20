// Example config for https://github.com/eleme/errordog.js,

exports = module.exports = {
  channels: [
    {
      channel: require('../alerters/console'),
      settings: {},
    }
  ]
};
