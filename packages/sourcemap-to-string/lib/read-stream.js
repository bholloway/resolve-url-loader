/*
 * MIT License http://opensource.org/licenses/MIT
 * Author: Ben Holloway @bholloway
 */
'use strict';

module.exports = stream =>
  new Promise((resolve, reject) => {
    const chunks = [];

    const cleanup = () => {
      stream.removeAllListeners('data');
      stream.removeAllListeners('end');
    };

    stream.on('data', chunk =>
      chunks.push(chunk)
    );
    stream.on('end', () => {
      cleanup();
      resolve(chunks.join(''));
    });
    stream.on('error', (error) => {
      cleanup();
      reject(error);
    });
  });
