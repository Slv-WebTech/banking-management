const crypto = require('crypto');

function generateAccountNumber() {
  let digits = '';
  for (let i = 0; i < 10; i += 1) {
    digits += crypto.randomInt(0, 10);
  }
  return digits;
}

module.exports = generateAccountNumber;
