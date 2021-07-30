// SET Development mode or Production mode
// UNIX : export NODE_ENV=development
// Windows : set NODE_ENV=production

process.env.NODE_ENV =
  process.env.NODE_ENV &&
  process.env.NODE_ENV.trim().toLowerCase() === 'production'
    ? 'production'
    : 'development';

require('dotenv').config();

console.log('NODE_ENV => ', process.env.NODE_ENV);
console.log('NODE_APP_INSTANCE => ', process.env.NODE_APP_INSTANCE);
console.log('__dir => ', __dirname);

const checkEnv = require('check-env');

checkEnv([
  'INFURA_PROJECT_ID',
  'INFURA_PROJECT_SECRET',
  'ETHERSCAN_API_KEY',
  'BTC_HOST',
  'BTC_USERNAME',
  'BTC_USER_PASSWORD',
  'BTC_MAINNET_PORT',
  'BTC_TESTNET_PORT',
  'BTC_REGTEST_PORT',
  'MONGO_DB_URL',
  'MONGO_DB_NAME',
  'MONGO_DB_USER',
  'MONGO_DB_PASSWORD',
  'GMAIL_USER',
  'GMAIL_APP_PASS',
  'NODE_ENDPOINT',
  'IPFS_URL',
  'FILE_TEMP_DIRECTORY',
  'IPFS_GLOBAL_PATH',
  'DEV_IPFS_NODE_PATH_FILE',
  'DEV_IPFS_NODE_PATH_METADATA',
  'DEV_IPFS_NODE_PATH_BIO',
  'PROD_IPFS_NODE_PATH_FILE',
  'PROD_IPFS_NODE_PATH_METADATA',
  'PROD_IPFS_NODE_PATH_BIO',
  'DID_ASSET_CODE',
  'DID_ASSET_PUBLIC',
]);

const createError = require('http-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const assetsRouter = require('./routes/api/assets');
const watchlistRouter = require('./routes/api/watchlist');
const btcRouter = require('./routes/api/btc');
const xlmRouter = require('./routes/api/xlm');
const ethRouter = require('./routes/api/eth');
const aaveRouter = require('./routes/api/aave');
const tronRouter = require('./routes/api/tron');
const atemRouter = require('./routes/api/atem');
const orbsRouter = require('./routes/api/orbs');
const didRouter = require('./routes/api/did');
const nftRouter = require('./routes/api/nft');

const app = express();

// DB Connection
const {mongooseConnect} = require('./utils/db/mongooseConnect');

mongooseConnect().then();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// allow cors module
// app.use(cors({origin: '*'}));
app.use(cors({credentials: true, origin: true}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const version = '/v1';

app.use('/', indexRouter);
app.use(`${version}/watchlist`, watchlistRouter);
app.use(`${version}/assets`, assetsRouter);
app.use(`${version}/btc`, btcRouter);
app.use(`${version}/xlm`, xlmRouter);
app.use(`${version}/eth`, ethRouter);
app.use(`${version}/aave`, aaveRouter);
app.use(`${version}/tron`, tronRouter);
app.use(`${version}/atem`, atemRouter);
app.use(`${version}/orbs`, orbsRouter);
app.use(`${version}/did`, didRouter);
app.use(`${version}/nft`, nftRouter);

// Initial Syncing Service
const {Syncing} = require('./utils/Syncing');
const winston = require('./config/winston');

const syncing = new Syncing('ETH');
syncing.initialize('ETH').then((r) => winston.log.info(r));

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
