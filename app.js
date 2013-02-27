/*jshint browser:true devel:true*/
/*global AbstractApp */

////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// Sub Class /////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

function MyApp(divobj,uuid,parent){
  this.myuuid = uuid;
  if (!divobj) {
    throw "First argument must be a valid html object";
  }
  this.div = divobj;
  this.dash = parent;
}
MyApp.prototype = Object.create(AbstractApp.prototype);

//overwrite start and update
MyApp.prototype.start = function() {
  //
  //Starts app and loads gui.
  //

  //set some attributes for the app div
  this.div.style.backgroundColor = "#BBFFBB";
  
  var this_app = this;
  this.getUIhtml(function(e,h){
    this_app.div.innerHTML = h;
    this_app.getAllElements();
    this_app.send_button.addEventListener('click',function(){
      var q = {};
      q.xxxxxxx = "y&"+this_app.query_field.value; //lazy
      this_app.sendEvent(this_app.event_field.value,
                         q,function(err,resp){
        this_app.dash.dbg(resp);
      });
    });   
  });
};
// This app has nothing to do on update
MyApp.prototype.update = function(){};

////////////////////////////////// Some "Private" Methods //////////////////////
MyApp.prototype.getAllElements = function(){
  this.event_field = this.getElement("event_field");
  this.query_field = this.getElement("query_field");
  this.send_button = this.getElement("send_button");
};

//spec says app needs to be named App
var App = MyApp;
