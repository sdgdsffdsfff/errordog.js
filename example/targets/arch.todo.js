module.exports = {
  name: 'arch.todo',
  path: '/var/log/arch/todo.log',
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
        rooms: ['arch', 'arch.todo'],
      },
    },
  ]
};
