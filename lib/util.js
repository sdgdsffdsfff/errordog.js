'use strict';

exports.isInt = function(val) {
  return !isNaN(val) && (+val == parseInt(val, 10))
};
