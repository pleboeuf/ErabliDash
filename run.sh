if [ -f ./data/dashboard.json ]; then
    cp ./data/dashboard.json ./data/dashboard.json.bk
    rm ./data/dashboard.json
fi
node app
