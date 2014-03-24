
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
//これを追加することで、ページ毎に読み込んでくるroutesの中を分けた
var chat = require('./routes/chatroom');
var geo = require('./routes/gelocation_test');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var socketio = require("socket.io"); //ソケット通信

var app = express();
/*
 * 2014-3-24
 * グローバル変数を実現させるためにlib/share.jsというファイルを用意して読み込む
 * これでshare.timerで扱うことができる
 */
var share = require('share');



// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//routes/index.jsを見に行っている
app.get('/', routes.index);
app.get('/chatroom', chat.chatroom);
app.get('/gelocation_test', geo.gelocation_test);
app.get('/users', user.list);

//ここでサーバを立ち上げている
var server = http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

//ここがポイントです
//サーバー実装の前に、エラーハンドリングを記載します。
process.on('uncaughtException', function(err) {
 console.log(err);
});

//サーバとソケットを結びつける
var io = socketio.listen(server);

//クライアントからアクションを受け取る窓口
//socketにはクライアントからのアクションが入っている
io.sockets.on("connection", function (socket) {
//メッセージ送信（送信者にも送られる）
//C_to_Smessageはイベント名
socket.on("C_to_S_message", function (data) {
//自分を含む全ての人に送信
io.sockets.emit("S_to_C_message", {value:data.value});
});

//ブロードキャスト（送信者以外の全員に送信）
socket.on("C_to_S_broadcast", function (data) {
//自分以外の人に送信
socket.broadcast.emit("S_to_C_message", {value:data.value});
});

//何を打ち込んでも、必ずHelloと返してしまう
socket.on("C_to_S_hellomessage", function (data) {
//helloと返すだけ
//このように表記している理由はクライアントで{value:data}と渡している
//つまりこっちでは受け取った引数の形(例えば sample_dataなら sample_data.valueに必要なデータが入っている)
socket.broadcast.emit("S_to_C_message", {value:data.value});
});

//緯度と経度を全てのユーザに伝える
//
socket.on("C_to_S_location", function (data) {
  io.sockets.emit("S_to_C_location", data);
});

socket.on("C_to_S_game_start", function () {
	if(share.timer == false) {
		//タイマーをスタートさせる
		share.timer = true;
		//以下のような書き方をすると動かなかった
		//setTimeout('io.sockets.emit("S_to_C_game_start")', 10000);
		setTimeout(function(){io.sockets.emit("S_to_C_game_start")}, 10000);
	}else{
		//タイマーがスタートしているので別の処理に飛ばす
		io.sockets.emit("S_to_C_announceMessage");
	}
});


//切断したときに送信
//connect, message, disconnectは予め用意されているイベント
socket.on("disconnect", function () {
	  //alert("disconnect from server");
  io.sockets.emit("S_to_C_message", {value:"user disconnected"});
});
});
