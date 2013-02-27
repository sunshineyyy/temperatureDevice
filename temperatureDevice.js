//
//  Dummy device.  invoked using nodejs
//

var fs     = require('fs');
var HEL    = require('./httpEventListener.js').HttpEventListener;
var OS     = require('os');
var crypto = require('crypto');
var dgram  = require('dgram');
var rSPI   = require('./rSPI');
var http   = require('http');
var url    = require('url');

//some parameters.  they should go in a config file later:
var app_code_path  = 'app.js';
var html_code_path = 'app.html';
var name           = 'Temperature Device';
var keystr = "obqQm3gtDFZdaYlENpIYiKzl+/qARDQRmiWbYhDW9wreM/APut73nnxCBJ8a7PwW";

/////////////////////////////// A basic device /////////////////////////////////
function Device(listen_port) {
  //a basic device.  Many functions are stubs and or return dummy values
  //listen_port: listen for http requests on this port
  //
  HEL.call(this,'cmd',listen_port);
  
  //Compute uuid
  var unique_str = OS.hostname()+listen_port;
  if (OS.type() === 'Linux'){
    //TODO: fill in for linux the MAC addr + listen_port
    //unique_str = mac addr + listen_port;
  } 
  //make uuid from unique string, roughly following uuid v5 spec 
  var hash = crypto.createHash('sha1').update(unique_str).digest('hex');
  this.uuid = hash.substr(0,8)+"-"+hash.substr(8,4)+"-5"+hash.substr(12,3) +
              "-b"+hash.substr(15,3)+"-"+hash.substr(18,12);
              
  //init device info
  this.port   = listen_port;
  this.status = "ready"; //other options are "logging"
  this.state  = "none"; //no other state for such a simple device
  
  //some device state
  this.logging_timer = null;
  this.manager_port = null;
  this.manager_IP = null;

  //add apps events here
  this.addEventHandler('getCode',this.getCodeEvent); 
  this.addEventHandler('getHTML',this.getHTMLEvent); 
  this.addEventHandler('info',this.info);
  this.addEventHandler('ping',this.info);
  this.addEventHandler('acquire',this.acquire);
  
  //custom events here
  this.addEventHandler('startLog',this.startLogging);
  this.addEventHandler('stopLog',this.stopLogging);
  
  //manually attach
  this.manager_IP = 'bioturk.ee.washington.edu';
  this.manager_port = 9090;
  this.my_IP = OS.networkInterfaces().eth0[0].address;
  this.sendAction('addDevice',{port: listen_port, addr: this.my_IP},function(){});
  
  //advertise that i'm here every 10 seconds until i'm aquired
  var this_device = this;
  /*this.advert_timer = setInterval(function(){
    this_device.advertise('224.250.67.238',17768);
  },10000);*/
}
Device.prototype = Object.create(HEL.prototype);
Device.prototype.constructor = Device;

Device.prototype.advertise = function(mcastAddr,mport) {
  //broadcast on a specified multicast address/port that you exist
  // mcastAddr: the multicast address
  // mport: the port to listen on.
  var p = "00000" + this.port;
  p = p.substr(p.length-5); //zero pad up to 5 chars
  
  var udpsock = dgram.createSocket('udp4');
  udpsock.bind();
  udpsock.setMulticastTTL(10);
  
  var message = new Buffer(keystr+p);
  udpsock.send(message,0,message.length,mport,mcastAddr,
               function(err,bytes){
    udpsock.close();
  });
};
////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////EVENTS////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
Device.prototype.info = function(fields,response) {
  //
  // parses info request
  // fields: the html query fields
  // response: an http.ServerResponse object used to respond to the server
  //
  
  response.writeHead(200, {'Content-Type': 'text/plain'});
  
  response.end(JSON.stringify( {
    uuid   : this.uuid,
    status : this.status,
    state  : this.state,
    name   : name,
    }));
  console.log('info req');
  
};
Device.prototype.acquire = function(fields,response) {
  //
  // set this as acquired
  // fields: the html query fields
  // response: an http.ServerResponse object used to respond to the server
  //
  response.writeHead(200, {'Content-Type': 'text/plain'});
  response.end();
  this.manager_port = parseInt(fields.port,10);
  this.manager_IP  = fields['@ip'] ;
  clearInterval(this.advert_timer);
};
Device.prototype.getCodeEvent = function(event_data, response) {
  //gets the app code and sends it in the response body
  //response: the HTTP response
  
  fs.readFile(app_code_path,'utf8',function(err,file) {
    if (!err) {
      response.writeHead(200, {'Content-Type': 'text/javascript'});
      response.end(file);
    } else {
      response.writeHead(404, {'Content-Type': 'text/plain'});
      response.end('cannot read file \n' + err);
    }
  });
};
Device.prototype.getHTMLEvent = function(event_data, response) {
  //gets the app code and sends it in the response body
  //response: the HTTP response
  
  fs.readFile(html_code_path,'utf8',function(err,file) {
    if (!err) {
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.end(file);
    } else {
      response.writeHead(404, {'Content-Type': 'text/plain'});
      response.end('cannot read file \n' + err);
    }
  });
};

////////////////NEW COMMANDS////////////////////////////
Device.prototype.startLogging = function(fields, resp) {
  "use strict";
  var this_dev = this;
  if(!this.logging_timer) {
    this.logging_timer = setInterval(function(){
      var options = {
        hostname: this_dev.manager_IP,
        port: this_dev.manager_port,
        path: "/?action=store&uuid="+this_dev.uuid,
        method: "POST"
      };
      var req = http.request(options, function(res){
        //TODO: check response in non-demo code
      });
      req.on("error",function(e){
        console.log("whoops "+e);
      });
      var t = this_dev.getTemp();
      req.end(t.toString());
      console.log('logging temp: '+t);
    },10000); //10seconds
  }
  
  //TODO: make response reflect success or fail
  resp.writeHead(200, {'Content-Type': 'text/html'});
  resp.end();
};
Device.prototype.stopLogging = function(fields,resp){
  clearInterval(this.logging_timer);
  //TODO: make response reflect success or fail
  resp.writeHead(200, {'Content-Type': 'text/html'});
  resp.end();
};
////////////////HELPERS //////////////////////////////
Device.prototype.getTemp = function() {
  //
  // Gets the temp from rpi.  Note this is blocking since the underlying
  // call to ioctl is blocking.
  // returns: the temp in deg C
  //
  var result = rSPI.readwriteSPI([96,0,0],'/dev/spidev0.1');
  var adcread = ((result[1]<<2) | (result[2]>>>6))*3.3/1024;
  var resistance = 3.3*10000/adcread - 10000;
  
  var a = 0.00113902;
  var b = 0.000232276;
  var c = 9.67879E-8;
  var lr = Math.log(resistance);
  var temp = -273.15+1/(a+b*lr+c*lr*lr*lr);

  return temp;  
};
Device.prototype.sendAction = function(action,fields,callback) {
  //
  // sends action to manager.
  // action: string - the action to send to manager
  // fields: object - a hash of fields to send to in the request
  // callback: called when done takes responce data as argument
  //
  var response_data = '';
  fields.action = action;
  var options = {
    hostname: this.manager_IP,
    port: this.manager_port,
    path: url.format({query:fields, pathname:'/'}),
    method: "GET"
  };
  console.log(options.path);
  var actionReq = http.request(options,function(result){
    result.on('data', function(chunk){
      response_data += chunk;
    });
    result.on('end',function(){
      callback(response_data);
    });
  });
  actionReq.end();
};
///////////////////////////////////// MAIN ////////////////////////////////////
//if i'm being called from command line
if(require.main === module) {
  var d1 = new Device(8432);
}

