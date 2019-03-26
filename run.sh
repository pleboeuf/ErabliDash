if [ -f ./data/dashboard.json ]; then
    cp ./data/dashboard.json ./data/dashboard.json.bk
    rm ./data/dashboard.json
fi
/home/erabliere/.nvm/versions/node/v8.15.0/bin/node app.js
