let startTime;

const SECOND = 1000;
const MINUTE = SECOND * 60;
const HOUR = MINUTE * 60;

const MAGNITUDES = [
  [HOUR, 'hours'],
  [MINUTE, 'minutes'],
  [SECOND, 'seconds'],
  [1, 'milliseconds'],
];

const getUptime = () => {
  let diff = Math.abs(new Date() - startTime);
  return MAGNITUDES.reduce((out, m) => {
    const current = Math.floor(diff / m[0]);
    diff %= m[0];
    if (out.length || current) {
      out.push(`${current} ${m[1]}`);
    }
    return out;
  }, []).join(', ');
};

module.exports = (date) => {
  startTime = date;
  return getUptime;
};
