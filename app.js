/*jshint browser:true devel:true*/
/*global AbstractApp Flotr */

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// Sub Class /////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function MyApp(divobj,uuid,dash){
  this.myuuid = uuid;
  if (!divobj) {
    throw "First argument must be a valid html object";
  }
  this.div = divobj;
  this.dash = dash;
}
MyApp.prototype = Object.create(AbstractApp.prototype);

//overwrite start and update
MyApp.prototype.start = function() {
  //
  //Starts app and loads gui.
  //
  var this_app = this;

  //set some attributes for the app div
  this.div.style.backgroundColor = "#BBFFBB";
  
  this.getUIhtml(function(e,h){
    this_app.div.innerHTML = h;
    this_app.getAllElements();
    this_app.start_button.addEventListener('click',function(){
      this_app.sendEvent('forward',{cmd: 'startLog',uuid: this_app.myuuid},
                         function(err,resp){
      });
    });
    this_app.stop_button.addEventListener('click',function(){
      this_app.sendEvent('forward',{cmd: 'stopLog',uuid: this_app.myuuid},
                         function(err,resp){
      });
    });
    this_app.dash.loadScript(
                   "http://www.humblesoftware.com//static/js/flotr2.min.js",
                   function(){
      this_app.Flotr = Flotr; //save ref to library
      this_app.update();
    });
  });
  this.setInterval(10*1000);
};

MyApp.prototype.update = function(){
  var now_epoch = (new Date()).getTime();
  var http = new XMLHttpRequest();
  var td;
  var this_app = this;
  http.open("GET","/?action=retrieve&uuid="+this.myuuid+"&since="+
            (now_epoch-1000*60) );
  http.onreadystatechange=function(){
    if (http.readyState==4 && http.status == 200) {
      var d = http.responseText;
      var foo = -70;
      td = d.split("\n").map(function(x){
        foo = foo+10;
        return [foo, parseFloat(x)];
      });
      this_app.Flotr.draw(this_app.data_div,[td]);
    }
  };
  http.send();
};

////////////////////////////////// Some "Private" Methods //////////////////////
MyApp.prototype.getAllElements = function(){
  this.data_div = this.getElement("data");
  this.stop_button = this.getElement("stop");
  this.start_button = this.getElement("start");
};

//spec says app needs to be named App
var App = MyApp;
