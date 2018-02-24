const request = require('request-promise');
const discord = require('discord.js');

let weatherConfig;
let tokens;
const geocodeEndpoint = 'https://maps.googleapis.com/maps/api/geocode/json?key=gkey&address=input';
const darkskyEndpoint = 'https://api.darksky.net/forecast/key/lat,lng';

function fahrenheitToCelcius(degree) {
  return (((degree - 32) * 5) / 9).toFixed(0);
}

function getGeocodeData(address) {
  let requestURL = geocodeEndpoint
    .replace('gkey', tokens.google_geocode)
    .replace('input', address);
  requestURL = encodeURI(requestURL);

  return request(requestURL).then((body) => {
    const geocodeData = JSON.parse(body);

    if (geocodeData.status !== 'OK') {
      // eslint-disable-next-line no-throw-literal
      throw 'I\'m sorry, the address couldn\'t be detected.';
    }

    const result = {
      address: geocodeData.results[0].formatted_address,
      coordinate: geocodeData.results[0].geometry.location,
    };

    return result;
  });
}

function getWeatherData(location) {
  const requestURL = darkskyEndpoint
    .replace('key', tokens.darksky)
    .replace('lat', location.coordinate.lat)
    .replace('lng', location.coordinate.lng);

  return request(requestURL).then((body) => {
    const weatherData = JSON.parse(body);

    const offset = weatherData.offset;
    const utcTime = weatherData.currently.time;
    // datetime is weird in javascript, please do change this part if you can
    const localTime = new Date(utcTime * 1000);
    localTime.setHours(localTime.getHours() + offset);
    let dateString;
    // toGMTString prints out timezone of host so we slice it off
    if (offset > 0) {
      dateString = localTime.toUTCString() + ' +' + offset;
    } else {
      dateString = localTime.toUTCString() + ' ' + offset;
    }

    const temperatureF = weatherData.currently.temperature.toFixed(0);
    const temperatureC = fahrenheitToCelcius(temperatureF);
    const summary = weatherData.currently.summary;
    const humidity = (weatherData.currently.humidity * 100).toFixed(0);
    // convert speed to freedom units
    const windSpeed = (weatherData.currently.windSpeed * 1.61).toFixed(0);
    const pressure = weatherData.currently.pressure.toFixed(0);
    const icon = weatherData.currently.icon;
    const timezone = weatherData.timezone;

    const result = {
      location: location.address,
      // A temporary fix until the eventual refactor.
      address: location.address,
      offset,
      localTime,
      dateString,
      temperatureC,
      temperatureF,
      summary,
      humidity,
      windSpeed,
      pressure,
      icon,
      timezone,
    };

    return result;
  });
}

function generateEmbed(data, verbose) {
  const embed = new discord.RichEmbed();

  if (verbose) {
    embed.setColor('#4286f4')
      .setFooter(`Local Time: ${data.dateString}`)
      .setTitle(`Weather in ${data.location}`)
      .addField('Summary', data.summary)
      .addField('Temperature °C', `${data.temperatureC} °C`, true)
      .addField('Temperature °F', `${data.temperatureF} °F`, true)
      .addField('Timezone', data.timezone, true)
      .addField('Humidity', `${data.humidity}%`, true)
      .addField('Wind Speed', `${data.windSpeed} km/h`, true)
      .addField('Air Pressure', `${data.pressure} mbar`, true)
      .setDescription(weatherConfig.icons[data.icon]);
  } else {
    embed.setColor('#4286f4')
      .setFooter(`Local Time: ${data.dateString}`)
      .setTitle(`Weather in ${data.address}`)
      .addField('Summary', data.summary)
      .addField('Temperature', `${data.temperatureC} °C / ${data.temperatureF} °F`, true)
      .addField('Humidity', `${data.humidity}%`, true)
      .setDescription(weatherConfig.icons[data.icon]);
  }

  return embed;
}

module.exports = {
  usage: [
    'weather <address> - brings current weather info for given address',
    'weather -v <address> - brings additional weather info for given address',
  ],
  run: (bot, message, cmdArgs) => {
    if (!cmdArgs) return true;

    let args = cmdArgs.split(' ');
    const verbose = args[0] === '-v';
    args = verbose ? args.slice(1) : args;

    getGeocodeData(args).then(getWeatherData)
                        .then(data => generateEmbed(data, verbose))
                        .then(embed => message.channel.sendEmbed(embed))
                        .catch(err => message.channel.sendMessage(err.toString()));
    return false;
  },
  init: (bot) => {
    weatherConfig = bot.settings.weather;
    tokens = bot.settings.tokens;
  },
};
