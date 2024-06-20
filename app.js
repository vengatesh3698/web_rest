var express = require('express');
var app = express();

global.__root     = __dirname + '/';
global.__core   ='../gn_core_module/src/';
global.__db_model =require(__core+'db/model');

var path=__root+'controllers/';

app.get('/api',(req,res)=>{
  res.status(200).send('API works.');
});

app.use('/gnapi/search',require(path+'Search'))
app.use('/gnapi/auth', require(path+'Authentication'));
app.use('/gnapi/user', require(path+'User'));
app.use('/gnapi/channel', require(path+'Channel'));
app.use('/gnapi/category', require(path+'Category'));
app.use('/gnapi/inventory', require(path+'Inventory'));
app.use('/gnapi/package', require(path+'Package'));
app.use('/gnapi/dashboard', require(path+'Dashboard'));
app.use('/gnapi/apps', require(path+'App'));
app.use('/gnapi/logo', require(path+'Logo'));
app.use('/gnapi/appupdate', require(path+'Appupdate'));
app.use('/gnapi/ott', require(path+'Ott'));
app.use('/gnapi/webseries', require(path+'Webseries'));
app.use('/gnapi/credit', require(path+'Credit'));
app.use('/gnapi/advertisement', require(path+'Advertisement'));
module.exports=app;
