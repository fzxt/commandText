const time = {
  MAGNITUDES: [
    [1000 * 60 * 60, 'hours'],
    [1000 * 60, 'minutes'],
    [1000, 'seconds'],
    [1, 'milliseconds'],
  ],

  timeElapsed(before, after) {
    let diff = Math.abs(after - before);
    return this.MAGNITUDES.reduce((out, m) => {
      const current = Math.floor(diff / m[0]);
      diff %= m[0];
      if (out.length || current) {
        out.push(`${current} ${m[1]}`);
      }
      return out;
    }, []).join(', ');
  },
};

module.exports = {
  time,
};
