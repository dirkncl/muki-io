(function(e,t){
  "use strict";
  function n(n){if("undefined"==typeof n)throw new Error('Pathformer [constructor]: "element" parameter is required');if(n.constructor===String&&(n=t.getElementById(n),!n))throw new Error('Pathformer [constructor]: "element" parameter is not related to an existing ID');if(!(n.constructor instanceof e.SVGElement||/^svg$/i.test(n.nodeName)))throw new Error('Pathformer [constructor]: "element" parameter must be a string or a SVGelement');this.el=n,this.scan(n)}
  function r(e,t,n){  this.isReady=!1,  this.setElement(e,t),  this.setOptions(t),  this.setCallback(n),  this.isReady&&this.init()}
  n.prototype.TYPES=["line","elipse","circle","polygon","polyline","rect"],
  n.prototype.ATTR_WATCH=["cx","cy","points","r","rx","ry","x","x1","x2","y","y1","y2"],
  n.prototype.scan=function(e){for(var t,n,r,i,o=e.querySelectorAll(this.TYPES.join(",")),a=0;a<o.length;a++)n=o[a],t=this[n.tagName.toLowerCase()+"ToPath"],r=t(this.parseAttr(n.attributes)),i=this.pathMaker(n,r),n.parentNode.replaceChild(i,n)},
  n.prototype.lineToPath=function(e){var t={};return t.d="M"+e.x1+","+e.y1+"L"+e.x2+","+e.y2,t},
  n.prototype.rectToPath=function(e){var t={},n=parseFloat(e.x)||0,r=parseFloat(e.y)||0,i=parseFloat(e.width)||0,o=parseFloat(e.height)||0;return t.d="M"+n+" "+r+" ",t.d+="L"+(n+i)+" "+r+" ",t.d+="L"+(n+i)+" "+(r+o)+" ",t.d+="L"+n+" "+(r+o)+" Z",t},
  n.prototype.polylineToPath=function(e){var t,n,r={},i=e.points.split(" ");if(-1===e.points.indexOf(",")){var o=[];for(t=0;t<i.length;t+=2)o.push(i[t]+","+i[t+1]);i=o}for(n="M"+i[0],t=1;t<i.length;t++)-1!==i[t].indexOf(",")&&(n+="L"+i[t]);return r.d=n,r},
  n.prototype.polygonToPath=function(e){var t=n.prototype.polylineToPath(e);return t.d+="Z",t},
  n.prototype.elipseToPath=function(e){var t=e.cx-e.rx,n=e.cy,r=parseFloat(e.cx)+parseFloat(e.rx),i=e.cy,o={};return o.d="M"+t+","+n+"A"+e.rx+","+e.ry+" 0,1,1 "+r+","+i+"A"+e.rx+","+e.ry+" 0,1,1 "+t+","+i,o},
  n.prototype.circleToPath=function(e){var t={},n=e.cx-e.r,r=e.cy,i=parseFloat(e.cx)+parseFloat(e.r),o=e.cy;return t.d="M"+n+","+r+"A"+e.r+","+e.r+" 0,1,1 "+i+","+o+"A"+e.r+","+e.r+" 0,1,1 "+n+","+o,t},
  n.prototype.pathMaker=function(e,n){var r,i,o=t.createElementNS("http://www.w3.org/2000/svg","path");for(r=0;r<e.attributes.length;r++)i=e.attributes[r],-1===this.ATTR_WATCH.indexOf(i.name)&&o.setAttribute(i.name,i.value);for(r in n)o.setAttribute(r,n[r]);return o},
  n.prototype.parseAttr=function(e){for(var t,n={},r=0;r<e.length;r++){if(t=e[r],-1!==this.ATTR_WATCH.indexOf(t.name)&&-1!==t.value.indexOf("%"))throw new Error("Pathformer [parseAttr]: a SVG shape got values in percentage. This cannot be transformed into 'path' tags. Please use 'viewBox'.");n[t.name]=t.value}return n};
  var i,o,a;
  r.LINEAR=function(e){return e},
  r.EASE=function(e){return-Math.cos(e*Math.PI)/2+.5},
  r.EASE_OUT=function(e){return 1-Math.pow(1-e,3)},
  r.EASE_IN=function(e){return Math.pow(e,3)},
  r.EASE_OUT_BOUNCE=function(e){var t=-Math.cos(e*(.5*Math.PI))+1,n=Math.pow(t,1.5),r=Math.pow(1-e,2),i=-Math.abs(Math.cos(n*(2.5*Math.PI)))+1;return 1-r+i*r},
  r.prototype.setElement=function(n,r){
    if("undefined"==typeof n)throw new Error('Vivus [constructor]: "element" parameter is required');
    if(n.constructor===String&&(n=t.getElementById(n),!n))throw new Error('Vivus [constructor]: "element" parameter is not related to an existing ID');
    if(this.parentEl=n,r&&r.file){var i=t.createElement("object");i.setAttribute("type","image/svg+xml"),i.setAttribute("width","100%"),i.setAttribute("height","100%"),i.setAttribute("data",r.file),n.appendChild(i),n=i}
    switch(n.constructor){
      case e.SVGSVGElement:
      case e.SVGElement:this.el=n,this.isReady=!0;break;
      case e.HTMLObjectElement:if(this.el=n.contentDocument&&n.contentDocument.querySelector("svg"),this.el)return void(this.isReady=!0);var o=this;n.addEventListener("load",function(){if(o.el=n.contentDocument&&n.contentDocument.querySelector("svg"),!o.el)throw new Error("Vivus [constructor]: object loaded does not contain any SVG");o.isReady=!0,o.init()});break;
      default:throw new Error('Vivus [constructor]: "element" parameter is not valid (or miss the "file" attribute)')  
    }
  },
  r.prototype.setOptions=function(t){var n=["delayed","async","oneByOne","scenario","scenario-sync"],i=["inViewport","manual","autostart"];if(void 0!==t&&t.constructor!==Object)throw new Error('Vivus [constructor]: "options" parameter must be an object');if(t=t||{},t.type&&-1===n.indexOf(t.type))throw new Error("Vivus [constructor]: "+t.type+" is not an existing animation `type`");if(this.type=t.type||n[0],t.start&&-1===i.indexOf(t.start))throw new Error("Vivus [constructor]: "+t.start+" is not an existing `start` option");if(this.start=t.start||i[0],this.isIE=-1!==e.navigator.userAgent.indexOf("MSIE"),this.duration=a(t.duration,120),this.delay=a(t.delay,null),this.dashGap=a(t.dashGap,2),this.forceRender=t.hasOwnProperty("forceRender")?!!t.forceRender:this.isIE,this.selfDestroy=!!t.selfDestroy,this.onReady=t.onReady,this.animTimingFunction=t.animTimingFunction||r.LINEAR,this.pathTimingFunction=t.pathTimingFunction||r.LINEAR,this.delay>=this.duration)throw new Error("Vivus [constructor]: delay must be shorter than duration")},
  r.prototype.setCallback=function(e){if(e&&e.constructor!==Function)throw new Error('Vivus [constructor]: "callback" parameter must be a function');this.callback=e||function(){}},
  r.prototype.mapping=function(){var t,n,r,i,o,s,u,l;for(l=s=u=0,n=this.el.querySelectorAll("path"),t=0;t<n.length;t++)r=n[t],o={el:r,length:Math.ceil(r.getTotalLength())},isNaN(o.length)?e.console&&console.warn&&console.warn("Vivus [mapping]: cannot retrieve a path element length",r):(s+=o.length,this.map.push(o),r.style.strokeDasharray=o.length+" "+(o.length+this.dashGap),r.style.strokeDashoffset=o.length,this.isIE&&(o.length+=this.dashGap),this.renderPath(t));for(s=0===s?1:s,this.delay=null===this.delay?this.duration/3:this.delay,this.delayUnit=this.delay/(n.length>1?n.length-1:1),t=0;t<this.map.length;t++){switch(o=this.map[t],this.type){case"delayed":o.startAt=this.delayUnit*t,o.duration=this.duration-this.delay;break;case"oneByOne":o.startAt=u/s*this.duration,o.duration=o.length/s*this.duration;break;case"async":o.startAt=0,o.duration=this.duration;break;case"scenario-sync":r=n[t],i=this.parseAttr(r),o.startAt=l+(a(i["data-delay"],this.delayUnit)||0),o.duration=a(i["data-duration"],this.duration),l=void 0!==i["data-async"]?o.startAt:o.startAt+o.duration,this.frameLength=Math.max(this.frameLength,o.startAt+o.duration);break;case"scenario":r=n[t],i=this.parseAttr(r),o.startAt=a(i["data-start"],this.delayUnit)||0,o.duration=a(i["data-duration"],this.duration),this.frameLength=Math.max(this.frameLength,o.startAt+o.duration)}u+=o.length,this.frameLength=this.frameLength||this.duration}},
  r.prototype.drawer=function(){var e=this;this.currentFrame+=this.speed,this.currentFrame<=0?(this.stop(),this.reset(),this.callback(this)):this.currentFrame>=this.frameLength?(this.stop(),this.currentFrame=this.frameLength,this.trace(),this.selfDestroy&&this.destroy(),this.callback(this)):(this.trace(),this.handle=i(function(){e.drawer()}))},
  r.prototype.trace=function(){var e,t,n,r;for(r=this.animTimingFunction(this.currentFrame/this.frameLength)*this.frameLength,e=0;e<this.map.length;e++)n=this.map[e],t=(r-n.startAt)/n.duration,t=this.pathTimingFunction(Math.max(0,Math.min(1,t))),n.progress!==t&&(n.progress=t,n.el.style.strokeDashoffset=Math.floor(n.length*(1-t)),this.renderPath(e))},
  r.prototype.renderPath=function(e){if(this.forceRender&&this.map&&this.map[e]){var t=this.map[e],n=t.el.cloneNode(!0);t.el.parentNode.replaceChild(n,t.el),t.el=n}},
  r.prototype.init=function(){this.frameLength=0,this.currentFrame=0,this.map=[],new n(this.el),this.mapping(),this.starter(),this.onReady&&this.onReady(this)},
  r.prototype.starter=function(){switch(this.start){case"manual":return;case"autostart":this.play();break;case"inViewport":var t=this,n=function(){t.isInViewport(t.parentEl,1)&&(t.play(),e.removeEventListener("scroll",n))};e.addEventListener("scroll",n),n()}},
  r.prototype.getStatus=function(){return 0===this.currentFrame?"start":this.currentFrame===this.frameLength?"end":"progress"},
  r.prototype.reset=function(){return this.setFrameProgress(0)},
  r.prototype.finish=function(){return this.setFrameProgress(1)},
  r.prototype.setFrameProgress=function(e){return e=Math.min(1,Math.max(0,e)),this.currentFrame=Math.round(this.frameLength*e),this.trace(),this},
  r.prototype.play=function(e){if(e&&"number"!=typeof e)throw new Error("Vivus [play]: invalid speed");return this.speed=e||1,this.handle||this.drawer(),this},
  r.prototype.stop=function(){return this.handle&&(o(this.handle),delete this.handle),this},
  r.prototype.destroy=function(){var e,t;for(e=0;e<this.map.length;e++)t=this.map[e],t.el.style.strokeDashoffset=null,t.el.style.strokeDasharray=null,this.renderPath(e)},
  r.prototype.parseAttr=function(e){var t,n={};if(e&&e.attributes)for(var r=0;r<e.attributes.length;r++)t=e.attributes[r],n[t.name]=t.value;return n},
  r.prototype.isInViewport=function(e,t){var n=this.scrollY(),r=n+this.getViewportH(),i=e.getBoundingClientRect(),o=i.height,a=n+i.top,s=a+o;return t=t||0,r>=a+o*t&&s>=n},
  r.prototype.docElem=e.document.documentElement,
  r.prototype.getViewportH=function(){var t=this.docElem.clientHeight,n=e.innerHeight;return n>t?n:t},
  r.prototype.scrollY=function(){return e.pageYOffset||this.docElem.scrollTop},
  i=function(){return e.requestAnimationFrame||e.webkitRequestAnimationFrame||e.mozRequestAnimationFrame||e.oRequestAnimationFrame||e.msRequestAnimationFrame||function(t){return e.setTimeout(t,1e3/60)}}(),
  o=function(){return e.cancelAnimationFrame||e.webkitCancelAnimationFrame||e.mozCancelAnimationFrame||e.oCancelAnimationFrame||e.msCancelAnimationFrame||function(t){return e.clearTimeout(t)}}(),
  a=function(e,t){var n=parseInt(e,10);return n>=0?n:t},
  "function"==typeof define&&define.amd?define([],function(){return r}):"object"==typeof exports?module.exports=r:e.Vivus=r
})(window,document);