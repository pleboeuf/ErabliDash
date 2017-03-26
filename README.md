# ErabliDash

Application Node.js d'affichage des données de l'érablière, se connectant à un ErabliCollector.

## 1. Install node modules

Assuming NPM and bower are already installed:

    npm install
    bower install

## 2. Run!

    node app

## Run the tests

    sudo npm install -g mocha
    mocha

## Build a Docker container

To build, change the hostname of config.json to 'erablicollecteur', then:

    docker build -t elecnix/erablidash -f docker-dash/Dockerfile .

To run, assuming your collector container is named 'prickly_mcnulty', run:

    docker run -d erablidash:/data -p 3000:3000 --link prickly_mcnulty:erablicollecteur elecnix/erablidash

