# AwesomeBot [![Build Status](https://travis-ci.org/progdisc/AwesomeBot.svg?branch=master)](https://travis-ci.org/progdisc/AwesomeBot) [![Code Climate](https://codeclimate.com/github/progdisc/AwesomeBot/badges/gpa.svg)](https://codeclimate.com/github/progdisc/AwesomeBot) [![david-dm](https://david-dm.org/progdisc/AwesomeBot.svg)](https://david-dm.org/progdisc/AwesomeBot)

## How to run it
First, make sure you have the latest version of [Node.js](https://nodejs.org/) and [npm](https://github.com/npm/npm).
We recommend using [nvm](https://github.com/creationix/nvm) to manage these, and there's a `.nvmrc` file in this project, so just run this and you're all set:
```sh
nvm use
```

Now you need to install the dependencies:
```sh
npm install
```

Then, in order to log your bot into Discord, set [your bot token](https://discordapp.com/developers/applications/me):
```sh
export DISCORD_TOKEN=<your discord app token>
# you could, instead, fill it in the ./settings.json file
```

And finally, start your bot with:
```sh
npm start
```

Before pushing any changes or submitting PRs, don't forget to run eslint, or our CI may reject your request:
```sh
npm run lint -- .
```
