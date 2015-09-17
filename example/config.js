module.exports = {
  targets: [
    require('./targets/arch.note.js'),
    require('./targets/arch.todo.js'),
  ],
  alerters: [
    {
      alerter: require('./alerters/webpage'),
      settings: {
        port: 9527,
        workers: 4,
        rooms: [
          'arch',
          'arch.note',
          'arch.todo',
        ],
      }
    }
  ]
};
