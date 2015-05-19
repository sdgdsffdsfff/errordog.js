// Example config for https://github.com/eleme/errordog.js,
// with default values. Copyright (c) Eleme, Inc.

{
  webapp: {
    root: '',
    port: 9527,
    auth: 'secret',
  },
  workspace: '.',
  alerters: [['./alerters/console']],
}
