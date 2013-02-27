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
};
// This app has nothing to do on update
MyApp.prototype.update = function(){
    this.data_div.innerHTML = '';
    var d = [[1,2],[2,4],[3,3]];
    this.Flotr.draw(this.data_div,[d]);    
};

////////////////////////////////// Some "Private" Methods //////////////////////
MyApp.prototype.getAllElements = function(){
  this.data_div = this.getElement("data");
  this.stop_button = this.getElement("stop");
  this.start_button = this.getElement("start");
};

//spec says app needs to be named App
var App = MyApp;
