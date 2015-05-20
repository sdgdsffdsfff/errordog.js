// Example config for https://github.com/eleme/errordog.js,

exports = module.exports = {
  logging: 'INFO',
  targets: [],
  channels: [
    {
      channel: require('./channels/console'),
      settings: {},
    }
  ]
};
