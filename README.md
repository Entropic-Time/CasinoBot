Credits to https://github.com/KevinNovak/Discord-Bot-TypeScript-Template as I am using their project as a backbone.

AWS - UBUNTU 20.04

sudo apt-get update -y
sudo apt-get install -y nodejs
sudo apt-get install -y npm
sudo npm install -g pm2 --yes

Upload source (don't replace database)

npm install -g npm-check-updates
ncu -u
npm install

cd 
//need to see what packages should be moved
npm install --omit=dev
pm2 start dist/start-manager.js --node-args="--enable-source-maps"

OR

npm run pm2:start
