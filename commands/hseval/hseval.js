const spawn = require('child_process').spawn;

function hseval(code, cb) {
  let out = '';
  const mueval = spawn('mueval', ['--inferred-type', '-e', code]);
  mueval.stdout.on('data', (d) => {
    out += d.toString();
  });
  mueval.stderr.on('data', (d) => {
    out += d.toString();
  });
  mueval.on('exit', () => {
    cb(out);
  });
}
module.exports = {
  usage: 'hseval <haskell expression> - runs <haskell expression> using mueval as the sandbox',
  run: (bot, message, args) => {
    if (!args) return true;
    hseval(args, (res) => {
      message.channel.sendMessage(`\`\`\`${res}\`\`\``);
    });
    return false;
  },
};
