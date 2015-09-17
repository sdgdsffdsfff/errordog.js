module.exports = {
  name: 'arch.note',
  path: '/var/log/arch/note.log',
  interval: 60,
  thresholds: [1, 45, 80],
  extract: function(line) {
    // extract something..
    return line;
  },
  alerters: [
    {
      alerter: require('errordog/alerters/webpage'),
      settings: {
        rooms: ['arch', 'arch.note'],
      },
    },
  ]
};
