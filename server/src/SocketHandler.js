'use strict';

let socket = require('socket.io');
let sha1   = require('sha1');
let queryMap = {};
// var IVM = require('./IVM');
// let handler = null;
var handler;
class SocketHandler {

    constructor(http) {
        if (!handler)
        {
            this.io  = socket(http);
            this.ivm = require('./IVM');
            this.io.on('connection', this.handleSocket);
            handler = this;
        }

        return handler;
    }

    handleSocket(socket) {
        console.log('connected');
        socket.on('echo', (data)=> {
            handler.echo(socket, data)
        });
        socket.on('init query', (data) => {
            handler.checkRoom(socket, data)
        });
    }

    checkRoom(socket, data) {
        console.log('CHECK ROOM: ' + data);
        var table    = data.table;
        var query    = data.query;
        let roomHash = sha1(query);
        queryMap[query] = roomHash;
        if (!this.io.sockets.adapter.rooms[roomHash]) {
            console.log('Room: ' + query + ' created!');
            handler.ivm.addQuery(table, query, (results, err)=> {
                if(err){
                    socket.emit('error message', {query: query, error: 'failed to create query'});
                    return;
                }
                socket.emit('init query', results);
                socket.join(roomHash);
            });
        }
        else {
            console.log('Room: ' + query + ' exists!');
            let queryObject = handler.ivm.getQuery(query);
            socket.emit('init query', {query: query, payload: queryObject.snapshot});
            socket.join(roomHash);
        }
    }

    echo(socket, data) {
        socket.emit('echo', data);
    }

    sendQueryDiff(query, diff) {
        let roomHash = queryMap[query];
        handler.io.to(roomHash).emit('diff query', diff);
    }

}

module.exports = SocketHandler;
