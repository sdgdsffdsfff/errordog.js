'use strict';

const createError     = require('create-error.js');
const ErrDogError     = createError('ErrDogError', 0xd1);
const FatalError      = createError('FatalError', ErrDogError, 0xd2);
const InvalidArgs     = createError('InvalidArgs', FatalError, 0xd3);
const InvalidConfig   = createError('InvalidConfig', FatalError, 0xd5);

exports.ErrDogError   = ErrDogError;
exports.FatalError    = FatalError;
exports.InvalidArgs   = InvalidArgs;
exports.InvalidConfig = InvalidConfig;
