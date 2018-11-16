!function(e){
  var t="recorderWorker.js",
      n=function(e,n){
        var r=n||{},
            i=r.bufferLen||4096,
            o=r.numChannels||2;
        this.context=e.context,
        this.node=(this.context.createScriptProcessor||this.context.createJavaScriptNode).call(this.context,i,o,o);
        var a=new Worker(r.workerPath||t);
        a.postMessage({command:"init",config:{sampleRate:this.context.sampleRate,numChannels:o}});
        var s,u=!1;
        this.node.onaudioprocess=function(e){if(u){for(var t=[],n=0;o>n;n++)t.push(e.inputBuffer.getChannelData(n));a.postMessage({command:"record",buffer:t})}},
        this.configure=function(e){for(var t in e)e.hasOwnProperty(t)&&(r[t]=e[t])},
        this.record=function(){u=!0},
        this.stop=function(){u=!1},
        this.clear=function(){a.postMessage({command:"clear"})},
        this.getBuffer=function(e){s=e||r.callback,a.postMessage({command:"getBuffer"})},
        this.exportWAV=function(e,t){if(s=e||r.callback,t=t||r.type||"audio/wav",!s)throw new Error("Callback not set");a.postMessage({command:"exportWAV",type:t})},
        a.onmessage=function(e){var t=e.data;s(t)},
        e.connect(this.node),
        this.node.connect(this.context.destination)
      };
  n.forceDownload=function(t,n){
    var r=(e.URL||e.webkitURL).createObjectURL(t),
        i=e.document.createElement("a");
    i.href=r,
    i.download=n||"output.wav";
    var o=document.createEvent("Event");
    o.initEvent("click",!0,!0),
    i.dispatchEvent(o)
  },
  e.Recorder=n
}(window),
window.Sketch = function(e,t){
    "use strict";
    function n(e){return"[object Array]"==Object.prototype.toString.call(e)}
    function r(e){return"function"==typeof e}
    function i(e){return"number"==typeof e}
    function o(e){return"string"==typeof e}
    function a(e,t,n){for(var r in t)!n&&r in e||(e[r]=t[r]);return e}
    function s(e){
      function t(t){r(t)&&t.apply(e,[].splice.call(arguments,1))}
      function n(e){for(_=0;_<V.length;_++)A=V[_],o(A)?T[(e?"add":"remove")+"EventListener"].call(T,A,b,!1):r(A)?b=A:T=A}
      function i(){N(m),m=M(i),L||(t(e.setup),L=r(e.setup)),R||(t(e.resize),R=r(e.resize)),e.running&&!D&&(e.dt=(S=+new Date)-e.now,e.millis+=e.dt,e.now=S,t(e.update),U&&(e.retina&&(e.save(),e.scale(F,F)),e.autoclear&&e.clear()),t(e.draw),U&&e.retina&&e.restore()),D=++D%e.interval}
      function s(){T=B?e.style:e.canvas,C=B?"px":"",P=e.width,I=e.height,e.fullscreen&&(I=e.height=y.innerHeight,P=e.width=y.innerWidth),e.retina&&U&&F&&(T.style.height=I+"px",T.style.width=P+"px",P*=F,I*=F),T.height!==I&&(T.height=I+C),T.width!==P&&(T.width=P+C),L&&t(e.resize)}
      function u(n){e.autopause&&("blur"==n.type?c:l)(),t(e[n.type],n)}
      function l(){e.now=+new Date,e.running=!0}
      function c(){e.running=!1}
      function f(){(e.running?c:l)()}
      function h(){U&&e.clearRect(0,0,e.width,e.height)}
      function p(){x=e.element.parentNode,_=v.indexOf(e),x&&x.removeChild(e.element),~_&&v.splice(_,1),n(!1),c()}
      var m,b,T,x,_,C,S,A,k,P,I,D=0,O=[],R=!1,L=!1,F=y.devicePixelRatio||1,B=e.type==g,U=e.type==d,j={x:0,y:0,ox:0,oy:0,dx:0,dy:0},V=[y,u,"focus","blur",s,"resize"],H={};
      for(k in w)H[w[k]]=!1;
      return (
        a(e,{touches:O,mouse:j,keys:H,dragging:!1,running:!1,millis:0,now:NaN,dt:NaN,destroy:p,toggle:f,clear:h,start:l,stop:c}),
        v.push(e),
        e.autostart&&l(),
        n(!0),
        s(),
        i(),
        e
      )
    }
    var u,l,
        c="E LN10 LN2 LOG2E LOG10E PI SQRT1_2 SQRT2 abs acos asin atan ceil cos exp floor log round sin sqrt tan atan2 pow max min".split(" "),
        f="__hasSketch",
        h=Math,
        d="canvas",
        p="webgl",
        g="dom",
        m=t,
        y=e,
        v=[],
        b={fullscreen:!0,autostart:!0,autoclear:!0,autopause:!0,container:m.body,interval:1,globals:!0,retina:!1,type:d},
        w={8:"BACKSPACE",9:"TAB",13:"ENTER",16:"SHIFT",27:"ESCAPE",32:"SPACE",37:"LEFT",38:"UP",39:"RIGHT",40:"DOWN"},
        T={
          CANVAS:d,
          WEB_GL:p,
          WEBGL:p,
          DOM:g,
          instances:v,
          install:function(e){if(!e[f]){for(var t=0;t<c.length;t++)e[c[t]]=h[c[t]];a(e,{TWO_PI:2*h.PI,HALF_PI:h.PI/2,QUATER_PI:h.PI/4,random:function(e,t){return n(e)?e[~~(h.random()*e.length)]:(i(t)||(t=e||1,e=0),e+h.random()*(t-e))},lerp:function(e,t,n){return e+n*(t-e)},map:function(e,t,n,r,i){return(e-t)/(n-t)*(i-r)+r}}),e[f]=!0}},
          create:function(e){return e=a(e||{},b),e.globals&&T.install(self),u=e.element=e.element||m.createElement(e.type===g?"div":"canvas"),l=e.context=e.context||function(){switch(e.type){case d:return u.getContext("2d",e);case p:return u.getContext("webgl",e)||u.getContext("experimental-webgl",e);case g:return u.canvas=u}}(),(e.container||m.body).appendChild(u),T.augment(l,e)},
          augment:function(e,t){return t=a(t||{},b),t.element=e.canvas||e,t.element.className+=" sketch",a(e,t,!0),s(e)}
        },
        x=["ms","moz","webkit","o"],
        _=self,
        C=0,
        S="AnimationFrame",
        A="request"+S,
        k="cancel"+S,
        M=_[A],
        N=_[k];
    for(var P=0;P<x.length&&!M;P++)
      M=_[x[P]+"Request"+S],
      N=_[x[P]+"Cancel"+S];
    return (
      _[A]=M=M||function(e){var t=+new Date,n=h.max(0,16-(t-C)),r=setTimeout(function(){e(t+n)},n);return C=t+n,r},
      _[k]=N=N||function(e){clearTimeout(e)},
      T//Sketch
    )
    
  }(window,document);

var Re=Re||{};
Re.Circles=function(){
  "use strict";
  function e(e,t){function n(){r.stopped||(r.analyser.getByteFrequencyData(r.bands),r.onUpdate&&r.onUpdate(r.bands),requestAnimationFrame(n))}this.stopped=!1,this.analyser=t.createAnalyser(),this.bands=new Uint8Array(this.analyser.frequencyBinCount),this.analyser.smoothingTimeConstant=.5,this.analyser.fftSize=256;var r=this;n(),this.connect(e,t)}
  function t(e,t){this.x=null!=e?e:0,this.y=null!=t?t:0,this.reset()}
  function n(e){
    var n=Sketch.create({
          type:g,
          container:e,
          particles:[],
          setup:function(){var e,n,r,i,o;for(e=0,n=m-1;n>=e;e+=1)i=random(this.width),o=random(2*this.height),r=new t(i,o),r.energy=random(r.band/256),this.particles.push(r)},
          draw:function(){var e,t=0,n=[],r=this.particles,i=r.length;this.globalCompositeOperation="lighter";do e=r[t],e.y<-e.size*e.level*e.scale*2&&(e.reset(),e.x=random(this.width),e.y=this.height+e.size*e.scale*e.level),k&&e.move(),n.push(e.draw(this));while(++t<i);return n}
        });
    n.updater=function(e){
      var t,n=0,r=[],i=this.particles,o=i.length;
      do 
        t=i[n],
        r.push(t.energy=e[t.band]/256);
      while(++n<o);
      return r
    };//,
    return n
  }
  function r(){h&&h.stop()}
  function load(e){p=document.getElementById(e),p.innerHTML=""}
  function unload(){r(),d&&(d.clear(),d.destroy(),d=null,h&&(h.onUpdate=null)),p&&(p.innerHTML=""),h=null,N=!1}
  function start(t,i){d||(d=n(p)),t&&(A.source=t,A.context=i,r(),h=new e(t,i),h.onUpdate=function(e){d.updater.call(d,e)},h.connect(t,i),M=!1,k=!0),N=!0}
  function s(){if(!A.source)throw new Error("Cannot restart without a source.");M||!k?a():start(A.source,A.context)}
  function stop(){M=!0,r()}
  function freeze(){k=!1}
  function tempo(e){T.MAX=e/150}
  function toggle(e,t){return N?(unload(),!1):A.source&&!M?(s(),!0):(start(e,t),!0)}
  var h,d,p,g="canvas",m=60,y=12,v=.5,b=.25,w={MIN:10,MAX:80},T={MIN:.2,MAX:1.2},x={MIN:.4,MAX:.8},_={MIN:.001,MAX:.005},C={MIN:.4,MAX:1.25},S=["#69D2E7","#1B676B","#BEF202","#EBE54D","#00CDAC","#1693A5","#F9D423","#FF4E50","#E7204E","#0CCABA","#362D6B"],A={},k=!1,M=!1,N=!1;
  return (
    e.prototype.connect=function(e,t){if(!e)throw new Error("Source is null!");e.connect(this.analyser)},
    e.prototype.stop=function(){this.stopped=!0,this.analyser.disconnect()},
    t.prototype.reset=function(){return this.level=1+floor(random(4)),this.scale=random(w.MIN,w.MAX),this.alpha=random(x.MIN,x.MAX),this.speed=random(T.MIN,T.MAX),this.color=random(S),this.size=random(C.MIN,C.MAX),this.spin=random(_.MAX,_.MAX),this.band=floor(random(y)),random()<.5&&(this.spin=-this.spin),this.smoothedScale=0,this.smoothedAlpha=0,this.decayScale=0,this.decayAlpha=0,this.rotation=random(TWO_PI),this.energy=0},
    t.prototype.move=function(){return this.rotation+=this.spin,this.y-=this.speed*this.level},
    t.prototype.draw=function(e){var t=exp(this.energy),n=this.scale*t,r=this.alpha*this.energy*1.5;return this.decayScale=max(this.decayScale,n),this.decayAlpha=max(this.decayAlpha,r),this.smoothedScale+=.3*(this.decayScale-this.smoothedScale),this.smoothedAlpha+=.3*(this.decayAlpha-this.smoothedAlpha),this.decayScale*=.985,this.decayAlpha*=.975,e.save(),e.beginPath(),e.translate(this.x+250*cos(this.rotation*this.speed),this.y),e.rotate(this.rotation),e.scale(this.smoothedScale*this.level,this.smoothedScale*this.level),e.moveTo(this.size*v,0),e.lineTo(this.size*b,0),e.lineWidth=1,e.lineCap="round",e.globalAlpha=this.smoothedAlpha/this.level,e.strokeStyle=this.color,e.stroke(),e.restore()},
    {
      name:"Circles",
      type:"Canvas",
      load:load,
      unload:unload,
      start:start,
      stop:stop,
      tempo:tempo,
      freeze:freeze,
      toggle:toggle
    }
  )
}.call(this);

var g=function(){this.elements=Array(16),this.loadIdentity()};
g.prototype={
  scale:function(e,t,n){return this.elements[0]*=e,this.elements[1]*=e,this.elements[2]*=e,this.elements[3]*=e,this.elements[4]*=t,this.elements[5]*=t,this.elements[6]*=t,this.elements[7]*=t,this.elements[8]*=n,this.elements[9]*=n,this.elements[10]*=n,this.elements[11]*=n,this},
  translate:function(e,t,n){return this.elements[12]+=this.elements[0]*e+this.elements[4]*t+this.elements[8]*n,this.elements[13]+=this.elements[1]*e+this.elements[5]*t+this.elements[9]*n,this.elements[14]+=this.elements[2]*e+this.elements[6]*t+this.elements[10]*n,this.elements[15]+=this.elements[3]*e+this.elements[7]*t+this.elements[11]*n,this},
  rotate:function(e,t,n,r){var i=Math.sqrt(t*t+n*n+r*r),o=Math.sin(e*Math.PI/180),a=Math.cos(e*Math.PI/180);if(i>0){var s,u,l,c,f,h,d,p,m,y,v;t/=i,n/=i,r/=i,s=t*t,u=n*n,l=r*r,c=t*n,f=n*r,h=r*t,d=t*o,p=n*o,m=r*o,y=1-a,v=new g,v.elements[0]=y*s+a,v.elements[1]=y*c-m,v.elements[2]=y*h+p,v.elements[3]=0,v.elements[4]=y*c+m,v.elements[5]=y*u+a,v.elements[6]=y*f-d,v.elements[7]=0,v.elements[8]=y*h-p,v.elements[9]=y*f+d,v.elements[10]=y*l+a,v.elements[11]=0,v.elements[12]=0,v.elements[13]=0,v.elements[14]=0,v.elements[15]=1,v=v.multiply(this),this.elements=v.elements}return this},
  frustum:function(e,t,n,r,i,o){var a,s=t-e,u=r-n,l=o-i;return 0>=i||0>=o||0>=s||0>=u||0>=l?this:(a=new g,a.elements[0]=2*i/s,a.elements[1]=a.elements[2]=a.elements[3]=0,a.elements[5]=2*i/u,a.elements[4]=a.elements[6]=a.elements[7]=0,a.elements[8]=(t+e)/s,a.elements[9]=(r+n)/u,a.elements[10]=-(i+o)/l,a.elements[11]=-1,a.elements[14]=-2*i*o/l,a.elements[12]=a.elements[13]=a.elements[15]=0,a=a.multiply(this),this.elements=a.elements,this)},
  perspective:function(e,t,n,r){var i=Math.tan(e/360*Math.PI)*n,o=i*t;return this.frustum(-o,o,-i,i,n,r)},
  ortho:function(e,t,n,r,i,o){var a=t-e,s=r-n,u=o-i,l=new g;return 0==a||0==s||0==u?this:(l.elements[0]=2/a,l.elements[12]=-(t+e)/a,l.elements[5]=2/s,l.elements[13]=-(r+n)/s,l.elements[10]=-2/u,l.elements[14]=-(i+o)/u,l=l.multiply(this),this.elements=l.elements,this)},
  multiply:function(e){for(var t=new g,n=0;4>n;n++)t.elements[4*n+0]=this.elements[4*n+0]*e.elements[0]+this.elements[4*n+1]*e.elements[4]+this.elements[4*n+2]*e.elements[8]+this.elements[4*n+3]*e.elements[12],t.elements[4*n+1]=this.elements[4*n+0]*e.elements[1]+this.elements[4*n+1]*e.elements[5]+this.elements[4*n+2]*e.elements[9]+this.elements[4*n+3]*e.elements[13],t.elements[4*n+2]=this.elements[4*n+0]*e.elements[2]+this.elements[4*n+1]*e.elements[6]+this.elements[4*n+2]*e.elements[10]+this.elements[4*n+3]*e.elements[14],t.elements[4*n+3]=this.elements[4*n+0]*e.elements[3]+this.elements[4*n+1]*e.elements[7]+this.elements[4*n+2]*e.elements[11]+this.elements[4*n+3]*e.elements[15];return this.elements=t.elements,this},
  copy:function(){for(var e=new g,t=0;16>t;t++)e.elements[t]=this.elements[t];return e},
  get:function(e,t){return this.elements[4*e+t]},
  invert:function(){var e=this.get(2,2)*this.get(3,3),t=this.get(3,2)*this.get(2,3),n=this.get(1,2)*this.get(3,3),r=this.get(3,2)*this.get(1,3),i=this.get(1,2)*this.get(2,3),o=this.get(2,2)*this.get(1,3),a=this.get(0,2)*this.get(3,3),s=this.get(3,2)*this.get(0,3),u=this.get(0,2)*this.get(2,3),l=this.get(2,2)*this.get(0,3),c=this.get(0,2)*this.get(1,3),f=this.get(1,2)*this.get(0,3),h=this.get(2,0)*this.get(3,1),d=this.get(3,0)*this.get(2,1),p=this.get(1,0)*this.get(3,1),g=this.get(3,0)*this.get(1,1),m=this.get(1,0)*this.get(2,1),y=this.get(2,0)*this.get(1,1),v=this.get(0,0)*this.get(3,1),b=this.get(3,0)*this.get(0,1),w=this.get(0,0)*this.get(2,1),T=this.get(2,0)*this.get(0,1),x=this.get(0,0)*this.get(1,1),_=this.get(1,0)*this.get(0,1),C=e*this.get(1,1)+r*this.get(2,1)+i*this.get(3,1)-(t*this.get(1,1)+n*this.get(2,1)+o*this.get(3,1)),S=t*this.get(0,1)+a*this.get(2,1)+l*this.get(3,1)-(e*this.get(0,1)+s*this.get(2,1)+u*this.get(3,1)),A=n*this.get(0,1)+s*this.get(1,1)+c*this.get(3,1)-(r*this.get(0,1)+a*this.get(1,1)+f*this.get(3,1)),k=o*this.get(0,1)+u*this.get(1,1)+f*this.get(2,1)-(i*this.get(0,1)+l*this.get(1,1)+c*this.get(2,1)),M=1/(this.get(0,0)*C+this.get(1,0)*S+this.get(2,0)*A+this.get(3,0)*k),N=M*C,P=M*S,I=M*A,D=M*k,O=M*(t*this.get(1,0)+n*this.get(2,0)+o*this.get(3,0)-(e*this.get(1,0)+r*this.get(2,0)+i*this.get(3,0))),R=M*(e*this.get(0,0)+s*this.get(2,0)+u*this.get(3,0)-(t*this.get(0,0)+a*this.get(2,0)+l*this.get(3,0))),L=M*(r*this.get(0,0)+a*this.get(1,0)+f*this.get(3,0)-(n*this.get(0,0)+s*this.get(1,0)+c*this.get(3,0))),F=M*(i*this.get(0,0)+l*this.get(1,0)+c*this.get(2,0)-(o*this.get(0,0)+u*this.get(1,0)+f*this.get(2,0))),B=M*(h*this.get(1,3)+g*this.get(2,3)+m*this.get(3,3)-(d*this.get(1,3)+p*this.get(2,3)+y*this.get(3,3))),U=M*(d*this.get(0,3)+v*this.get(2,3)+T*this.get(3,3)-(h*this.get(0,3)+b*this.get(2,3)+w*this.get(3,3))),j=M*(p*this.get(0,3)+b*this.get(1,3)+x*this.get(3,3)-(g*this.get(0,3)+v*this.get(1,3)+_*this.get(3,3))),V=M*(y*this.get(0,3)+w*this.get(1,3)+_*this.get(2,3)-(m*this.get(0,3)+T*this.get(1,3)+x*this.get(2,3))),H=M*(p*this.get(2,2)+y*this.get(3,2)+d*this.get(1,2)-(m*this.get(3,2)+h*this.get(1,2)+g*this.get(2,2))),q=M*(w*this.get(3,2)+h*this.get(0,2)+b*this.get(2,2)-(v*this.get(2,2)+T*this.get(3,2)+d*this.get(0,2))),G=M*(v*this.get(1,2)+_*this.get(3,2)+g*this.get(0,2)-(x*this.get(3,2)+p*this.get(0,2)+b*this.get(1,2))),$=M*(x*this.get(2,2)+m*this.get(0,2)+T*this.get(1,2)-(w*this.get(1,2)+_*this.get(2,2)+y*this.get(0,2)));return this.elements[0]=N,this.elements[1]=P,this.elements[2]=I,this.elements[3]=D,this.elements[4]=O,this.elements[5]=R,this.elements[6]=L,this.elements[7]=F,this.elements[8]=B,this.elements[9]=U,this.elements[10]=j,this.elements[11]=V,this.elements[12]=H,this.elements[13]=q,this.elements[14]=G,this.elements[15]=$,this},
  inverse:function(){var e=this.copy();return e.invert()},
  transpose:function(){var e=this.elements[1];return this.elements[1]=this.elements[4],this.elements[4]=e,e=this.elements[2],this.elements[2]=this.elements[8],this.elements[8]=e,e=this.elements[3],this.elements[3]=this.elements[12],this.elements[12]=e,e=this.elements[6],this.elements[6]=this.elements[9],this.elements[9]=e,e=this.elements[7],this.elements[7]=this.elements[13],this.elements[13]=e,e=this.elements[11],this.elements[11]=this.elements[14],this.elements[14]=e,this},
  loadIdentity:function(){for(var e=0;16>e;e++)this.elements[e]=0;return this.elements[0]=1,this.elements[5]=1,this.elements[10]=1,this.elements[15]=1,this}
};

var Le=Le||{};
Le.shader=Le.shader||{},
Le.shader.loadFromScriptNodes=function(e,t,n){var r=document.getElementById(t),i=document.getElementById(n);return r&&i?new Le.shader.Shader(e,r.text,i.text):null},
Le.shader.loadTextFileSynchronous=function(e){var t,n='loadTextFileSynchronous failed to load url "'+e+'"';if(t=new XMLHttpRequest,t.overrideMimeType&&t.overrideMimeType("text/plain"),t.open("GET",e,!1),t.send(null),4!=t.readyState)throw n;return t.responseText},
Le.shader.loadFromURL=function(e,t,n){var r=Le.shader.loadTextFileSynchronous(t),i=Le.shader.loadTextFileSynchronous(n);return r&&i?new Le.shader.Shader(e,r,i):null},
Le.shader.glslNameToJs_=function(e){return e.replace(/_(.)/g,function(e,t){return t.toUpperCase()})},
Le.shader.Shader=function(e,t,n){this.program=e.createProgram(),this.gl=e;var r=this.loadShader(this.gl.VERTEX_SHADER,t);if(null!=r){this.gl.attachShader(this.program,r),this.gl.deleteShader(r);var i=this.loadShader(this.gl.FRAGMENT_SHADER,n);if(null!=i){this.gl.attachShader(this.program,i),this.gl.deleteShader(i),this.gl.linkProgram(this.program),this.gl.useProgram(this.program);var o=this.gl.getProgramParameter(this.program,this.gl.LINK_STATUS);if(!o){var a=this.gl.getProgramInfoLog(this.program);return output("Error linking program:\n"+a),this.gl.deleteProgram(this.program),void(this.program=null)}for(var s=/(uniform|attribute)\s+\S+\s+(\S+)\s*;/g,u=null;null!=(u=s.exec(t+"\n"+n));){var l=u[2],c=Le.shader.glslNameToJs_(l),f=-1;"uniform"==u[1]?this[c+"Loc"]=this.getUniform(l):"attribute"==u[1]&&(this[c+"Loc"]=this.getAttribute(l)),f>=0&&(this[c+"Loc"]=f)}}}},
Le.shader.Shader.prototype.bind=function(){this.gl.useProgram(this.program)},
Le.shader.Shader.prototype.loadShader=function(e,t){var n=this.gl.createShader(e);if(null==n)return null;if(this.gl.shaderSource(n,t),this.gl.compileShader(n),!this.gl.getShaderParameter(n,this.gl.COMPILE_STATUS)){var r=this.gl.getShaderInfoLog(n);return output("Error compiling shader:\n"+r),this.gl.deleteShader(n),null}return n},
Le.shader.Shader.prototype.getAttribute=function(e){return this.gl.getAttribLocation(this.program,e)},
Le.shader.Shader.prototype.getUniform=function(e){return this.gl.getUniformLocation(this.program,e)};

var Fe=function(){
  var e=0,
      n=1,
      r=2,
      i=3,
      o=0,
      a=0,
      s=0,
      u=-35,
      l=202,
      c=35;
  var f=function(e,t){
        this.canvasElementID=e,
        this.analysisType=r,
        this.sonogram3DWidth=256,
        this.sonogram3DHeight=256,
        this.sonogram3DGeometrySize=10,
        this.freqByteData=0,
        this.texture=0,
        this.TEXTURE_HEIGHT=256,
        this.yoffset=0,
        this.frequencyShader=0,
        this.waveformShader=0,
        this.sonogramShader=0,
        this.sonogram3DShader=0,
        this.backgroundColor=[121/255,169/255,135/255,1],
        this.foregroundColor=[63/255,39/255,0,1];
        var n=this;
        if(this.initGL(),!this.gl)
          throw new Error("webGL initialization failed.");
        this.loadShaders(function(){
          n.loadScene(),t()
        })
      };
  return (
    f.prototype.setAnalyser=function(e){this.analyser=e},
    f.prototype.loadShaders=function(e){function n(){--s||e()}function r(e){var r="./viz/sonogram/shaders/";t([r+e[1],r+e[2]],function(t){var o=t[r+e[1]],a=t[r+e[2]];i[e[0]+"Shader"]=new Le.shader.Shader(i.gl,o,a),n()})}var i=this,o=[["frequency","common-vertex.shader","frequency-fragment.shader"],["waveform","common-vertex.shader","waveform-fragment.shader"],["sonogram","common-vertex.shader","sonogram-fragment.shader"],["sonogram3D","sonogram-vertex.shader","sonogram-fragment.shader"]],a=[o[3]],s=a.length;a.forEach(r)},
    f.prototype.initGL=function(){o=new g,a=new g,s=new g;var e=document.getElementById(this.canvasElementID);e.getContext||(this.canvasElementID="analyser-view",e.innerHTML='<canvas width="'+window.innerWidth+'" height="'+window.innerHeight+'" id="'+this.canvasElementID+'"></canvas>',e=document.getElementById(this.canvasElementID)),this.canvas=e;var t=e.getContext("experimental-webgl")||e.getContext("webgl");this.gl=t},
    f.prototype.loadScene=function(){var t=this.gl,n=this.canvas,i=this.sonogram3DWidth,o=this.sonogram3DHeight,a=this.sonogram3DGeometrySize,s=this.backgroundColor;this.has3DVisualizer=t.getParameter(t.MAX_VERTEX_TEXTURE_IMAGE_UNITS)>0,this.has3DVisualizer||this.analysisType!=r||(this.analysisType=e);var c=new m(n);this.cameraController=c,c.xRot=u,c.yRot=l,t.clearColor(s[0],s[1],s[2],s[3]),t.enable(t.DEPTH_TEST);var f=new Float32Array([1,1,0,-1,1,0,-1,-1,0,1,1,0,-1,-1,0,1,-1,0]),h=new Float32Array([1,1,0,1,0,0,1,1,0,0,1,0]),d=f.byteLength;this.vboTexCoordOffset=d;var p=t.createBuffer();this.vbo=p,t.bindBuffer(t.ARRAY_BUFFER,p),t.bufferData(t.ARRAY_BUFFER,d+h.byteLength,t.STATIC_DRAW),t.bufferSubData(t.ARRAY_BUFFER,0,f),t.bufferSubData(t.ARRAY_BUFFER,d,h);var g=i*o;if(g>65536)throw"Sonogram 3D resolution is too high: can only handle 65536 vertices max";f=new Float32Array(3*g),h=new Float32Array(2*g);for(var y=0;o>y;y++)for(var v=0;i>v;v++)f[3*(i*y+v)+0]=a*(v-i/2)/i,f[3*(i*y+v)+1]=0,f[3*(i*y+v)+2]=a*(y-o/2)/o,h[2*(i*y+v)+0]=v/(i-1),h[2*(i*y+v)+1]=y/(o-1);var b=f.byteLength;this.vbo3DTexCoordOffset=b;var w=t.createBuffer();this.sonogram3DVBO=w,t.bindBuffer(t.ARRAY_BUFFER,w),t.bufferData(t.ARRAY_BUFFER,b+h.byteLength,t.STATIC_DRAW),t.bufferSubData(t.ARRAY_BUFFER,0,f),t.bufferSubData(t.ARRAY_BUFFER,b,h);var T=(i-1)*(o-1)*6;this.sonogram3DNumIndices=T;for(var x=new Uint16Array(T),_=0,y=0;o-1>y;y++)for(var v=0;i-1>v;v++)x[_++]=y*i+v,x[_++]=y*i+v+1,x[_++]=(y+1)*i+v+1,x[_++]=y*i+v,x[_++]=(y+1)*i+v+1,x[_++]=(y+1)*i+v;var C=t.createBuffer();this.sonogram3DIBO=C,t.bindBuffer(t.ELEMENT_ARRAY_BUFFER,C),t.bufferData(t.ELEMENT_ARRAY_BUFFER,x,t.STATIC_DRAW)},
    f.prototype.initByteBuffer=function(){var e=this.gl,t=this.TEXTURE_HEIGHT;if(!this.freqByteData||this.freqByteData.length!=this.analyser.frequencyBinCount){freqByteData=new Uint8Array(this.analyser.frequencyBinCount),this.freqByteData=freqByteData,this.texture&&(e.deleteTexture(this.texture),this.texture=null);var n=e.createTexture();this.texture=n,e.bindTexture(e.TEXTURE_2D,n),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.REPEAT),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR);var r=new Uint8Array(freqByteData.length*t);e.texImage2D(e.TEXTURE_2D,0,e.ALPHA,freqByteData.length,t,0,e.ALPHA,e.UNSIGNED_BYTE,r)}},
    f.prototype.unload=function(){if(this.texture){var e=this.gl;e.deleteTexture(this.texture),e.deleteBuffer(this.vbo),e.deleteBuffer(this.sonogram3DVBO),this.canvas.width=1,this.canvas.height=1}},
    f.prototype.setAnalysisType=function(e){(this.has3DVisualizer||e!=r)&&(this.analysisType=e)},
    f.prototype.analysisType=function(){return this.analysisType},
    f.prototype.doFrequencyAnalysis=function(t){var o=this.freqByteData;switch(this.analysisType){case e:this.analyser.smoothingTimeConstant=.75,this.analyser.getByteFrequencyData(o);break;case n:case r:this.analyser.smoothingTimeConstant=.1,this.analyser.getByteFrequencyData(o);break;case i:this.analyser.smoothingTimeConstant=.1,this.analyser.getByteTimeDomainData(o)}},
    f.prototype.drawGL=function(){var t=this.canvas,u=this.gl,l=this.vbo,f=this.vboTexCoordOffset,h=this.sonogram3DVBO,d=this.vbo3DTexCoordOffset,p=this.sonogram3DGeometrySize,m=this.sonogram3DNumIndices,y=(this.sonogram3DWidth,this.sonogram3DHeight),v=this.freqByteData,b=this.texture,w=this.TEXTURE_HEIGHT,T=this.frequencyShader,x=this.waveformShader,_=this.sonogramShader,C=this.sonogram3DShader;u.bindTexture(u.TEXTURE_2D,b),u.pixelStorei(u.UNPACK_ALIGNMENT,1),this.analysisType!=n&&this.analysisType!=r&&(this.yoffset=0),u.texSubImage2D(u.TEXTURE_2D,0,0,this.yoffset,v.length,1,u.ALPHA,u.UNSIGNED_BYTE,v),(this.analysisType==n||this.analysisType==r)&&(this.yoffset=(this.yoffset+1)%w);var S,A,k,M,N,P,I,D=this.yoffset;switch(this.analysisType){case e:case i:u.bindBuffer(u.ARRAY_BUFFER,l),I=this.analysisType==e?T:x,I.bind(),S=I.gPositionLoc,A=I.gTexCoord0Loc,k=I.frequencyDataLoc,M=I.foregroundColorLoc,N=I.backgroundColorLoc,u.uniform1f(I.yoffsetLoc,.5/(w-1)),P=f;break;case n:u.bindBuffer(u.ARRAY_BUFFER,l),_.bind(),S=_.gPositionLoc,A=_.gTexCoord0Loc,k=_.frequencyDataLoc,M=_.foregroundColorLoc,N=_.backgroundColorLoc,u.uniform1f(_.yoffsetLoc,D/(w-1)),P=f;break;case r:u.bindBuffer(u.ARRAY_BUFFER,h),C.bind(),S=C.gPositionLoc,A=C.gTexCoord0Loc,k=C.frequencyDataLoc,M=C.foregroundColorLoc,N=C.backgroundColorLoc,u.uniform1i(C.vertexFrequencyDataLoc,0);var O=this.yoffset/(w-1);u.uniform1f(C.yoffsetLoc,O);var R=(O*(y-1)|0)/(y-1);u.uniform1f(C.vertexYOffsetLoc,R),u.uniform1f(C.verticalScaleLoc,p/4),s.loadIdentity(),s.perspective(c,t.width/t.height,1,100),a.loadIdentity(),a.translate(0,0,-10),o.loadIdentity(),o.rotate(this.cameraController.xRot,1,0,0),o.rotate(this.cameraController.yRot,0,1,0);var L=new g;L.multiply(o),L.multiply(a),L.multiply(s),u.uniformMatrix4fv(C.worldViewProjectionLoc,u.FALSE,L.elements),P=d}k&&u.uniform1i(k,0),M&&u.uniform4fv(M,this.foregroundColor),N&&u.uniform4fv(N,this.backgroundColor),u.enableVertexAttribArray(S),u.vertexAttribPointer(S,3,u.FLOAT,!1,0,0),u.enableVertexAttribArray(A),u.vertexAttribPointer(A,2,u.FLOAT,u.FALSE,0,P),u.clear(u.COLOR_BUFFER_BIT|u.DEPTH_BUFFER_BIT),this.analysisType==e||this.analysisType==i||this.analysisType==n?u.drawArrays(u.TRIANGLES,0,6):this.analysisType==r&&u.drawElements(u.TRIANGLES,m,u.UNSIGNED_SHORT,0),u.disableVertexAttribArray(S),u.disableVertexAttribArray(A)},
    f
  )
}();

var Re=Re||{};
Re.Hills=function(){
  "use strict";
  function e(){g>v||(v==m&&(f.doFrequencyAnalysis(),f.drawGL()),window.requestAnimationFrame(e))}
  function t(){c&&c.disconnect()}
  function n(e){l=e}
  function r(){t(),f&&f.unload(),l&&(document.getElementById(l).innerHTML=""),h=v,v=d,f=c=null}
  function i(e){f=new Fe(l,e)}
  function o(n,r){function o(){if(!n)return void(v=p);y.source=n,y.context=r,t(),c=r.createAnalyser(),c.fftSize=1024,f.setAnalyser(c),f.initByteBuffer(),n.connect(c);var i=v;v=m,g>i&&e()}f?o():i(o)}
  function a(){v=p,t()}
  function s(){v=g}
  function u(e,t){return v>=p?(r(),!1):y.source&&h!=m?(o(),!0):(o(e,t),!0)}
  var l,c,f,h,d=0,p=1,g=2,m=3,y={},v=d;
  return{
    name:"Hills",
    type:"WebGL",
    load:n,
    unload:r,
    start:o,
    stop:a,
    freeze:s,
    toggle:u
  }
}();

var Be=function(){
  "use strict";
  var e=Math.max,t=Math.floor,n=function(n){var r={};r.levelsCount=8,r.waveCount=32,r.level=0,r.waveDataRaw=[],r.waveData=[],r.levelsData=[];var i,o,a,s=!1,u=0,l=0,c=35,f=.97,h=.3,d=1.05,p=function(){i=n.createAnalyser(),i.smoothingTimeConstant=0,i.fftSize=1024,r.binCount=i.frequencyBinCount,r.waveBins=t(r.binCount/r.waveCount),r.levelBins=t(r.binCount/r.levelsCount),o=new Uint8Array(r.binCount)};return r.connect=function(e){s||(e.connect(i),s=!0)},r.disconnect=function(){i.disconnect()},r.update=function(){if(s){i.getByteFrequencyData(o);for(var t=0,n=0,p=0,g=0,m=r.levelsCount;m>g;g++){p=0;for(var y=0,v=r.levelBins;v>y;y++)p+=o[g*r.levelBins+y];t=p/r.levelBins/256,r.levelsData[g]=t,n+=t}r.level=n/r.levelsCount,l=r.level,l>u?(r.onBeat&&r.onBeat(),u=l*d,a=0):c>=a?a++:(u*=f,u=e(u,h))}},p(),r};
  return n
}();

var Re=Re||{};
Re.Lights=function(){
  "use strict";
  function e(e){var n=["./viz/lights/vertex.shader","./viz/lights/fragment.shader"];t(n,function(t){var r=v.createShader(v.VERTEX_SHADER),i=v.createShader(v.FRAGMENT_SHADER);if(v.shaderSource(r,t[n[0]]),v.shaderSource(i,t[n[1]]),v.compileShader(r),v.compileShader(i),!v.getShaderParameter(r,v.COMPILE_STATUS))throw v.getShaderInfoLog(r);if(!v.getShaderParameter(i,v.COMPILE_STATUS))throw v.getShaderInfoLog(i);if(w=v.createProgram(),v.attachShader(w,r),v.attachShader(w,i),v.linkProgram(w),!v.getProgramParameter(w,v.LINK_STATUS))throw v.getProgramInfoLog(w);v.useProgram(w),w.attributes={position:v.getAttribLocation(w,"a_position")},w.uniforms={resolution:v.getUniformLocation(w,"u_resolution"),brightness:v.getUniformLocation(w,"u_brightness"),blobiness:v.getUniformLocation(w,"u_blobiness"),particles:v.getUniformLocation(w,"u_particles"),scanlines:v.getUniformLocation(w,"u_scanlines"),energy:v.getUniformLocation(w,"u_energy"),millis:v.getUniformLocation(w,"u_millis")},e()})}
  function n(t){e(function(){v.clearColor(0,0,0,1),v.enable(v.DEPTH_TEST),v.depthFunc(v.LEQUAL),T=v.createBuffer(),T.vertexCount=6,v.bindBuffer(v.ARRAY_BUFFER,T);var e=new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]);v.bufferData(v.ARRAY_BUFFER,e,v.STATIC_DRAW),v.enableVertexAttribArray(w.attributes.position),v.vertexAttribPointer(w.attributes.position,2,v.FLOAT,!1,0,0),o(),t()})}
  function r(e,t){w&&(v.uniform2f(w.uniforms.resolution,e,t),v.uniform1f(w.uniforms.brightness,N),v.uniform1f(w.uniforms.blobiness,P),v.uniform1f(w.uniforms.particles,O),v.uniform1i(w.uniforms.scanlines,I),v.uniform1f(w.uniforms.energy,D))}
  function i(){return _>=k||(requestAnimationFrame(i),k==C)?void 0:(m.update(),v.clear(v.COLOR_BUFFER_BIT|v.DEPTH_BUFFER_BIT),v.uniform1f(w.uniforms.millis,M+=.01),N>.5&&v.uniform1f(w.uniforms.brightness,N*=.96),v.drawArrays(v.TRIANGLE_STRIP,0,T.vertexCount))}
  function o(){if(!b)return console.warn("Resize event triggered with no canvas!");var e=window.innerWidth,t=window.innerHeight;return b.width=e,b.height=t,v.viewport(0,0,e,t),r(e,t)}
  function a(e){var t;b=document.createElement("canvas"),b.width=window.innerWidth,b.height=window.innerHeight,b.style.width="100%",b.style.height="100%";try{v=b.getContext("experimental-webgl")||b.getContext("webgl")}catch(r){t=r}return!v||t?e(r||new Error("Unable to initialize WebGL context.")):(window.addEventListener("resize",o,!0),g.appendChild(b),void n(e))}
  function s(){window.removeEventListener("resize",o,!0),v&&v.deleteBuffer(T),b&&(b.size=1,b.width=1),w=T=v=b=null,g&&g.childNodes[0]&&g.removeChild(g.childNodes[0])}
  function u(){m&&m.disconnect()}
  function l(e){g=document.getElementById(e)}
  function c(){u(),s(),y=k,k=x,m=null}
  function f(e,t){function n(n){if(n)throw n;if(!e)return void(k=_);A.source=e,A.context=t,u(),m=new Be(t),m.connect(e),m.onBeat=function(){N=2};var r=k;k=S,C>r&&i()}v?n():a(n)}
  function h(){k=_,u()}
  function d(){k=C}
  function p(e,t){return k>=_?(c(),!1):A.source&&y!=S?(f(),!0):(f(e,t),!0)}
  var g,m,y,v,b,w,T,x=0,_=1,C=2,S=3,A={},k=x,M=0,N=1,P=1.2,I=!1,D=1,O=14;
  return{
    name:"Lights",
    type:"WebGL",
    load:l,
    unload:c,
    start:f,
    stop:h,
    freeze:d,
    toggle:p
  }
}();
