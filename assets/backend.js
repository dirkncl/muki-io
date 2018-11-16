var M=function(){
  function t(e,t){
    var e="[MIDI] "+e;
    return (
      t?
        console.log(e,t)
      :
        console.log(e)
    )
  }
  function r(e){
    return (
      "undefined"!=typeof TimidityModule?
        e()
      :
        void A(FileLibs,e)
    )
  }
  function Init(Src,Dest){
    return (
      AudioParam=Src,
      AudioDest=Dest,
    this
    )
  }
  function Status(){
    return CurrentStatus  
  }
  function s(e){
    CurrentStatus=e,
    t("Current status: "+CurrentStatus),
    SoundObj.trigger(CurrentStatus,AudioElement.source,AudioParam)
  }
  function Play(e){
    l(e.data,e.type)
  }
  function l(e,n){
    return (
      "crashed"==CurrentStatus?
        t("Crashed. Cannot continue.")
      :
        (
          v(!0),
          s("loading"), 
          void r(
            function(t){
              if(t)
                return T(t);
              Sounds.module=TimidityModule,
              "undefined"!=typeof Module&&(Module=null),
              j.file=new Int8Array(e),
              U.file=Sounds.alloc(j.file.length),
              Sounds.toMemory(j.file,U.file),
              V||(Sounds.init(),V=!0);
              var n=d(),
                  r=Sounds.get_missing_count(n);
              return (
                0>=r?
                  p(n)
                :
                  (
                    N=new x(n,r),
                    void N.start(
                      function(e){
                        if(e)
                          return T(e);
                        var t=d();
                        p(t)
                    })
                  )
              )
            }
          )
        )
    )
  }
  function Stop(){
    return (
      "stopped"==CurrentStatus?
        t("Already stopped.")
      :
        void("loading"==CurrentStatus?b():v())
    )
  }
  function Pause(){
    return (
      "playing"!=CurrentStatus?
        t("Trying to pause, but currently "+CurrentStatus)
      :
        (
          DayTime=new Date,
          s("paused"),
          void AudioElement.source.disconnect()
        )
    )
  }
  function Resume(){
    if("playing"==CurrentStatus)
      return t("Trying to resume, but currently "+CurrentStatus);
    var e=(new Date-DayTime)/1e3;
    H+=e,
    AudioElement.source.connect(AudioElement.gain),
    s("playing")
  }
  function d(){
    if(!j.file)
      return t("Data array was unloaded, apparently. Cannot load song."),void w();
    var e=Sounds.open_stream(U.file,j.file.length);
    try{
      var n=Sounds.load_song(e,AudioParam.sampleRate,R,L,F)
    }
    catch(r){
      return T(new Error("Unable to load song. Possibly memory error.")),console.log(r),v(),void s("crashed")
    }
    return Sounds.close_stream(e),n
  }
  function p(e){
    if(AudioElement.source)return t("Already playing!");
    if("loading"!=CurrentStatus)return t("Status changed. Current: "+CurrentStatus),w();
    M=e,
    Sounds.start(e),
    U.samples=Sounds.alloc(4*F),
    j.samples=new Int16Array(Sounds.module.HEAP16.buffer,U.samples,2*F),
    "freeverb"==Verbs?
      k=new a(AudioParam.sampleRate,L,.9,.7,.5,.3)
    :
      Verbs&&(k=new Reverb(Q,Y,z,W,X,Z));
    //var n=Sounds.module._mid_song_get_total_time(M);
    SoundObj.trigger("length",Sounds.module._mid_song_get_total_time(M)/1e3),
    AudioElement.source=AudioParam.createScriptProcessor(F,1,2),
    AudioElement.source.onaudioprocess=g,
    AudioElement.gain=AudioParam.createGain(),
    AudioElement.gain.gain.value=G,
    AudioElement.source.connect(AudioElement.gain),
    AudioElement.gain.connect(AudioDest),
    s("playing"),
    CurrentTime=AudioParam.currentTime,
    H=0
  }
  function g(e){
    if("playing"!=CurrentStatus)
      return t("Not playing. Skipping chunk.");
    var n=AudioParam.currentTime-CurrentTime-H;
    SoundObj.trigger("progress",n);
    var r=Sounds.module._mid_song_read_wave(M,U.samples,4*F,!1);
    if(0>=r)
      return t("No more bytes! Song finished."),m(e.outputBuffer),void y();
    if("freeverb"==Verbs)
      for(var i=0;L>i;i++){
        var o,a=0,s=e.outputBuffer.getChannelData(i);
        do 
          o=j.samples[i+2*a],
          s[a]=k.pushSample(o,i)/32768;
        while(++a<F)
    }
    else{
      for(var u=Verbs?k.process(j.samples):j.samples,i=0;L>i;i++)
        for(var s=e.outputBuffer.getChannelData(i),a=0,l=e.outputBuffer.length;l>a;a++)
          s[a]=u[i+2*a]/32768;
      u=null
    }
  }
  function m(e){
    for(var t=0;t<e.numberOfChannels;t++)
      for(var n=e.getChannelData(t),r=0,i=e.length;i>r;r++)
      n[r]=0
  }
  function y(){
    v(),
    SoundObj.trigger("finished")
  }
  function v(e){
    function t(){
      Object.keys(AudioElement).forEach(
        function(e){
          AudioElement[e].disconnect(),
          "source"==e&&(AudioElement[e].onaudioprocess=null),
          delete AudioElement[e]
        }
      )
    }
    AudioElement.gain&&(AudioElement.gain.gain.value=0),
    k=null,
    w(),
    e?
      t()
    :
      (setTimeout(t,50),s("stopped"))
  }
  function b(){
    N&&N.stop()
  }
  function w(){
    "undefined"!=typeof Sounds.module&&(
      N&&(N.unload(),N=null),
      M&&(t("Unloading song."),Sounds.unload_song(M),M=null),
      Object.keys(j).forEach(function(e){t("Unloading array: "+e),j[e]=null}),
      Object.keys(U).forEach(function(e){t("Unloading pointer: "+e),Sounds.free(U[e]),U[e]=null})
    )
  }
  function T(e){
    t("Error! "+e.message),
    SoundObj.trigger("error",e)
  }
  function x(e,n){
    this.requests=[],
    this.loaded=[],
    this.song=e,
    this.total=n,
    this.log=function(e){t("Loader: "+e)}
  }
  var SoundObj={};
  n(SoundObj);
  var AudioParam,AudioDest,k,M,N,CurrentStatus,CurrentTime,DayTime,
      Types=["audio/mus","audio/midi","audio/x-midi","audio/midi-sf2"],
      R=16,
      L=2,
      F=8192,
      AudioElement={},
      U={},
      j={},
      V=!1,
      H=0,
      FileLibs="./js/lib/libtimidity.js",
      G=1,
      Verbs="freeverb",
      z=.9,
      W=.4,
      X=.8,
      Y=3e3,
      Q=5*Y,
      Z=2e3;
  x.prototype.start=function(t){
    function n(){
      l.log("Finished loading. "+f+" errors, pending reqs: "+l.requests.length),
      SoundObj.trigger("load_end"),
      0===f?
        t()
      :
        t(new Error("Failed loading "+f+" instruments."))
    }
    function r(e){
      e?
        l.log("Error "+f++ +" loading instrument: "+e.message)
      :
        l.log("Loaded instrument. Pending: "+u),
      --u||n()
    }
    function i(e,t){
      if(!c[e]&&(c[e]=parseInt(t),l.total==Object.keys(c).length))
        for(var n in c)
          h+=c[n]
    }
    function o(e){
      if(i(this,e.total),(!d[this]||d[this]<e.loaded)&&(d[this]=e.loaded),0!=h){
        var t=0;
        for(var n in d)t+=d[n];
        var r=t/h*100;
        SoundObj.trigger("load_progress",r)
      }
    }
    function a(t,n,r){
      l.log("Fetching: "+n);
      var i={
            responseType:"arraybuffer",
            progress_cb:o.bind(n)
          };
      return e(
        t+n,
        i,
        function(e,i,o){
          if(e||!o||!l.loaded)
            return r(e||new Error("Error loading file: "+t+n));
          if(-1==l.loaded.indexOf(n)){
            var a=new Int8Array(o);
            Sounds.module.FS_createDataFile("pat/",n,a,!0,!0),
            l.loaded.push(n),
            a=null
          }
          o.length=0,
          r()
        }
      )
    }
    function s(e){
      var t=a(
            "./pat/",
            e,
            function(e){
              l.requests.splice(l.requests.indexOf(t),1),
              r(e)
            }
          );
      l.requests.push(t)
    }
    for(var u,l=this,c={},f=0,h=0,d={},p=[],g=0;g<this.total;g++)
      p.push(Sounds.get_missing_patch(this.song,g));
    var m=p.reverse().filter(function(e,t,n){return-1===n.indexOf(e,t+1)}).reverse();
    u=m.length,
    m.forEach(s),
    SoundObj.trigger("load_start")
  },
  x.prototype.stop=function(){
    this.log("Aborting "+this.requests.length+" requests."),
    this.requests.forEach(function(e){e.abort()}),
    this.unload()
  },
  x.prototype.unload=function(){
    return (
      null==this.loaded?
        this.log("Already unloaded!")
      :
        void(
          this.loaded.length>0&&(this.log("Unloading "+this.loaded.length+" instruments in memory."),this.loaded.forEach(function(e){Sounds.module.FS_unlink("pat/"+e)}),this.loaded=null)
        )
    )
  };
  var Sounds={};
  return (
    Sounds.module=null,
    Sounds.init=function(){return this.module.ccall("mid_init","number",[],[])},
    Sounds.unload=function(){return this.module.ccall("mid_exit","void",[],[])},
    Sounds.get_missing_count=function(e){return this.module.ccall("mid_song_get_num_missing_instruments","number",["number"],[e])},
    Sounds.get_missing_patch=function(e,t){return this.module.ccall("mid_song_get_missing_instrument","string",["number","number"],[e,t])},
    Sounds.open_stream=function(e,t){return this.module.ccall("mid_istream_open_mem","number",["number","number","number"],[e,t,!1])},
    Sounds.close_stream=function(e){return this.module.ccall("mid_istream_close","number",["number"],[e])},
    Sounds.load_song=function(e,t,n,r,i){
      return this.module.ccall("mid_song_load_with_options","number",["number","number","number","number"],[e,t,n,r,i])
    },
    Sounds.unload_song=function(e){
      this.module.ccall("mid_song_free","void",["number"],[e])
    },
    Sounds.start=function(e){
      return this.module.ccall("mid_song_start","void",["number"],[e])
    },
    Sounds.alloc=function(e){
      return this.module._malloc(e)
    },
    Sounds.free=function(e){
      Sounds.module._free(e)
    },
    Sounds.toMemory=function(e,t){
      return this.module.writeArrayToMemory(e,t)
    },
    SoundObj.init=Init,
    SoundObj.status=Status,
    SoundObj.play=Play,
    SoundObj.stop=Stop,
    SoundObj.pause=Pause,
    SoundObj.resume=Resume,
    SoundObj.types=Types,
    SoundObj
  )
}(this);
//only for browser and window platform
//"object"==typeof module&&"object"==typeof module.exports&&(module.exports=M);

var N=function(){
  function t(e,t){return e="[MT32] "+e,t?console.log(e,t):console.log(e)}
  function i(e,t){M=e,N=t;var n=Math.ceil(W*(z/M.sampleRate));return B=re?n:W,this}
  function o(t){return Z?t():void e(FileMctrlBin,{responseType:"arraybuffer"},function(n,r,i){return n||!i?t(new Error("Unable to get file: "+FileMctrlBin)):(S(FileMctrlBin,i),void e(Q,{responseType:"arraybuffer"},function(e,n,r){return e||!r?t(new Error("Unable to get file: "+Q)):(S(Q,r),Z=!0,void t())}))})}
  function a(e,n){return L?n():void o(function(r){if(r)return n(r);var i="audio/midi-mt32-gm"==e||"audio/midi"||"audio/x-midi"==e;t("Initializing synth with GM mode:",i),L=ie.module.ccall("load_synth",["number"],["string","string","number","boolean","boolean"],[FileMctrlBin,Q,H,q,G,i]),n(null,i)})}
  function u(){return P}
  function l(e){P=e,t("Current status: "+P),k.trigger(P,j.source,M)}
  function c(e,t){r(e,"mt32",t)}
  function f(e){F=e,h(e.data,e.type,e.lib)}
  function h(e,n,r){return"loading"==P?t("Already loading a song!"):"crashed"==P?t("Crashed. Cannot continue."):(x(!0),l("loading"),void A(FileLibs,function(i){function o(e){a(n,function(n,i){return n?C(n):(!i&&r&&r.data&&(t("Sysex detected. Loading..."),m(r.data)||t("Sysex loading failed. Continuing anyway...")),void y(e))})}if(i)return C(i);ie.module=MT32Module,Module=null;var s=new Int8Array(e);return 77!==s[0]?c(s,o):void o(s)}))}
  function d(){return"stopped"==P?t("Already stopped."):(x(),void k.trigger("stopped"))}
  function p(){return"playing"!=P?t("Trying to pause, but currently "+P):(D=new Date,l("paused"),void j.source.disconnect())}
  function g(){if("playing"==P)return t("Trying to resume, but currently "+P);var e=(new Date-D)/1e3;V+=e,j.source.connect(j.gain),l("playing")}
  function m(e){var t=!0;J.sysex=new Int8Array(e),ee.sysex=ie.module._malloc(J.sysex.length),ie.module.writeArrayToMemory(J.sysex,ee.sysex);try{ie.module._play_sysex(L,ee.sysex,J.sysex.length)}catch(n){C(new Error("Unable to load sysex!")),console.log(n),l("crashed"),t=!1}return t}
  function y(e){if(j.source)return t("Already playing!");if("loading"!=P)return t("Status changed. Current: "+P),_();var n;J.data=e,ee.data=ie.module._malloc(J.data.length),ie.module.writeArrayToMemory(J.data,ee.data);try{n=ie.module.ccall("play_midi",["number"],["number","number","number"],[ee.data,J.data.length,L])}catch(r){return C(new Error("Unable to load song. Possibly file error.")),console.log(r),x(),void l("crashed")}F.info&&F.info.length?n=F.info.length:n+=3,k.trigger("length",n),O=n,R=O*M.sampleRate,I=M.currentTime,V=0,j.source=M.createScriptProcessor(W,1,$),j.source.onaudioprocess=v,j.gain=M.createGain(),j.gain.gain.value=K,j.source.connect(j.gain),j.gain.connect(N),b(),l("playing")}
  function v(e){if("playing"!=P)return t("Not playing chunk, status is "+P);var n=te.shift();if(!n)return t("No available buffers."),void(0>=R&&(w(e.outputBuffer),T()));var r=M.currentTime-I-V-.5;k.trigger("progress",r);for(var i=0;$>i;i++)e.outputBuffer.getChannelData(i).set(n.getChannelData(i));!function(){b()}()}
  function b(){if(0>=R)return void t("No more frames to render.");ee.samples||(ee.samples=ie.module._malloc(4*B),J.samples=new Int16Array(ie.module.HEAP16.buffer,ee.samples,2*B),re&&(ne[0]=new s(z,M.sampleRate,1,W,!0),ne[1]=new s(z,M.sampleRate,1,W,!0)));var e=ie.module.ccall("render_frames",["number"],["number","number","number"],[L,ee.samples,B]);if(-1==e)return t("render_frames returned empty result."),x();R-=W;var n,r=M.createBuffer($,B,z);for(n=0;$>n;n++){var i,o=r.getChannelData(n);for(i=0;B>i;i++)o[i]=J.samples[n+2*i]/32768}if(!re)return te.push(r);for(n=0;$>n;n++)ne[n].resampler(r.getChannelData(n));var a=M.createBuffer($,W,44100);for(n=0;$>n;n++)a.getChannelData(n).set(ne[n].outputBuffer);r=null,te.push(a)}
  function w(e){for(var t=0;t<e.numberOfChannels;t++)for(var n=e.getChannelData(t),r=0,i=e.length;i>r;r++)n[r]=0}
  function T(){x(!0),k.trigger("finished")}
  function x(e){function t(){Object.keys(j).forEach(function(e){j[e].disconnect(),"source"==e&&(j[e].onaudioprocess=null),delete j[e]})}j.gain&&(j.gain.gain.value=0),_(),e?t():(setTimeout(t,50),l("stopped"))}
  function _(){"undefined"!=typeof ie.module&&(L&&(t("Unloading synth."),ie.module.ccall("unload_synth",[],["number"],[L]),L=null),te.length=0,ne.length=0,Object.keys(J).forEach(function(e){t("Unloading array: "+e),J[e]=null}),Object.keys(ee).forEach(function(e){t("Unloading pointer: "+e),ie.module._free(ee[e]),ee[e]=null}))}
  function C(e){t("Error! "+e.message),k.trigger("error",e)}
  function S(e,t){t=t.length?t:new Int8Array(t),ie.module.FS_createDataFile("/",e,t,!0,!0)}
  var k={};
  n(k);
  var M,N,P,I,D,O,R,L,F,B,
      U=["audio/xmi","audio/midi-mt32","audio/midi-mt32-gm"],
      j={},
      V=0,
      H=0,
      q=1,
      G=!1,
      $=2,
      z=32e3,
      W=16384,
      FileLibs="./js/lib/libmt32.js",
      FileMctrlBin="./mctrl.bin",
      Q="./mpcm.bin",
      Z=!1,
      K=3,
      J={},
      ee={},
      te=[],
      ne=[],
      re=!0,
      ie={};
  return (k.init=i,k.status=u,k.play=f,k.stop=d,k.pause=p,k.resume=g,k.types=U,k)
}(this),

P=function(){
  function e(e,t){var e="[MOD] "+e;return t?console.log(e,t):console.log(e)}
  function t(e,t){return v=e,b=t,this}
  function r(){return w}
  function i(t){w=t,e("Current status: "+w),y.trigger(w,C.source,v)}
  function o(e){a(e.data)}
  function a(t){return"loading"==w?e("Already loading a song!"):"crashed"==w?e("Crashed. Cannot continue."):(p(!0),i("loading"),void A(N,function(e){return e?m(e):(P.module=OpenMPTModule,Module=null,void c(t))}))}
  function s(){return"stopped"==w?e("Already stopped."):(p(),void y.trigger("stopped"))}
  function u(){return"playing"!=w?e("Trying to pause, but currently "+w):(x=new Date,i("paused"),void C.source.disconnect())}
  function l(){if("playing"==w)return e("Trying to resume, but currently "+w);var t=(new Date-x)/1e3;S+=t,C.source.connect(C.gain),i("playing")}
  function c(t){if(C.source)return e("Already playing!");if("loading"!=w)return e("Status changed. Current: "+w),g();var n=new Int8Array(t),r=P.module._malloc(n.byteLength);if(P.module.HEAPU8.set(n,r),P.modulePtr=P.module._openmpt_module_create_from_memory(r,n.byteLength,0,0,0),P.leftBufferPtr=P.module._malloc(4*M),P.rightBufferPtr=P.module._malloc(4*M),0==P.modulePtr)return p();var o=P.module._openmpt_module_get_duration_seconds(P.modulePtr);y.trigger("length",o),C.source=v.createScriptProcessor(M,1,2),C.source.onaudioprocess=f,C.gain=v.createGain(),C.gain.gain.value=k,C.source.connect(C.gain),C.gain.connect(b),n=null,buffer=null,T=v.currentTime,S=0,i("playing")}
  function f(e){if("playing"==w){var t=v.currentTime-T-S;y.trigger("progress",t);var n=e.outputBuffer.getChannelData(0),r=e.outputBuffer.getChannelData(1),i=n.length;if(0==P.modulePtr)return h(e.outputBuffer),p();for(var o=0,a=!1;i>0;){var s=Math.min(i,M),u=P.module._openmpt_module_read_float_stereo(P.modulePtr,v.sampleRate,s,P.leftBufferPtr,P.rightBufferPtr);0==u&&(a=!0);for(var l=P.module.HEAPF32.subarray(P.leftBufferPtr/4,P.leftBufferPtr/4+u),c=P.module.HEAPF32.subarray(P.rightBufferPtr/4,P.rightBufferPtr/4+u),f=0;u>f;++f)n[o+f]=l[f],r[o+f]=c[f];for(var f=u;s>f;++f)n[o+f]=0,r[o+f]=0;i-=s,o+=s}u=null,l=null,c=null,a&&d()}}
  function h(e){for(var t=0;t<e.numberOfChannels;t++)for(var n=e.getChannelData(t),r=0,i=e.length;i>r;r++)n[r]=0}
  function d(){p(!0),y.trigger("finished")}
  function p(e){function t(){Object.keys(C).forEach(function(e){C[e].disconnect(),"source"==e&&(C[e].onaudioprocess=null),delete C[e]})}C.gain&&(C.gain.gain.value=0),g(),e?t():(setTimeout(t,50),i("stopped"))}
  function g(){"undefined"!=typeof P.module&&P.module._openmpt_module_destroy&&(0!=P.modulePtr&&(P.module._openmpt_module_destroy(P.modulePtr),P.modulePtr=0),0!=P.leftBufferPtr&&(P.module._free(P.leftBufferPtr),P.leftBufferPtr=0),0!=P.rightBufferPtr&&(P.module._free(P.rightBufferPtr),P.rightBufferPtr=0))}
  function m(t){e("Error! "+t.message),y.trigger("error",t)}
  var y={};
  n(y);
  var v,b,w,T,x,
      T=["audio/mod","audio/s3m","audio/it","audio/xm","audio/psm","audio/amf"],
      C={},
      S=0,
      k=1.5,
      M=4096,
      N="./js/lib/libopenmpt.js",
      P={};
      return (
        y.init=t,
        y.status=r,
        y.play=o,
        y.stop=s,
        y.pause=u,
        y.resume=l,
        y.types=_,
        y
      )
}(this),

I=function(){
  function e(e,t){var e="[GME] "+e;return t?console.log(e,t):console.log(e)}
  function t(e,t){return x=e,_=t,this}
  function r(){return C}
  function i(t){C=t,e("Current status: "+C),T.trigger(C,L.source,x)}
  function o(e){var t=e.info&&e.info.track;D="number"!=typeof t&&e.type.match(/nsf|gbs/),I=e.info&&e.info.length,q=e.type&&"audio/nsf"==e.type?1.5:3,s(e.data,t)}
  function s(t,n){return"loading"==C?e("Already loading a song!"):"crashed"==C?e("Crashed. Cannot continue."):(v(!0),i("loading"),void A(j,function(e){return e?w(e):(G.module=GMEModule,Module=null,void f(t,n))}))}
  function u(){return"stopped"==C?e("Already stopped."):(v(),void T.trigger("stopped"))}
  function l(){return"playing"!=C?e("Trying to pause, but currently "+C):(k=new Date,i("paused"),void L.source.disconnect())}
  function c(){if("playing"==C)return e("Trying to resume, but currently "+C);var t=(new Date-k)/1e3;F+=t,L.source.connect(L.gain),i("playing")}
  function f(t,n){return L.source?e("Already playing!"):"loading"!=C?(e("Status changed. Current: "+C),b()):(V.file=t.length?t:new Int8Array(t),H.file=G.module._malloc(V.file.length),G.module.writeArrayToMemory(V.file,H.file),(M=G.load(H.file,V.file.length,x.sampleRate))?(H.samples=G.module._malloc(4*U),V.samples=new Int16Array(G.module.HEAP16.buffer,H.samples,2*U),L.source=x.createScriptProcessor(U,1,2),L.source.onaudioprocess=d,L.gain=x.createGain(),L.gain.gain.value=q,L.source.connect(L.gain),L.gain.connect(_),O=new a(x.sampleRate,B,.9,.7,.5,.3),void h(n||0)):(w(new Error("Unable to load song. Possibly invalid file.")),v(),void i("crashed")))}
  function h(t){var n=0>t||G.start(M,t);return n?!1:(N=t,I?P=1e3*I:(P=G.get_length(M,N),-1==P&&(P=12e4),P>3e4&&G.fade_at(M,P-8e3)),T.trigger("length",P/1e3),e("Playing track number "+N),S=x.currentTime,F=0,i("playing"),!0)}
  function d(t){if("playing"!=C)return e("Not playing chunk, status is "+C);var n=x.currentTime-S-F;if(T.trigger("progress",n),1e3*n>P)return p(t.outputBuffer),y();var r=G.module._gme_play(M,2*U,H.samples);if(r)return p(t.outputBuffer),y();for(var i=0;i<t.outputBuffer.numberOfChannels;i++){var o,a=0,s=t.outputBuffer.getChannelData(i);do o=V.samples[i+2*a],s[a]=O.pushSample(o,i)/32768;while(++a<U)}}
  function p(e){for(var t=0;t<e.numberOfChannels;t++)for(var n=e.getChannelData(t),r=0,i=e.length;i>r;r++)n[r]=0}
  function g(e){return"stopped"!=C&&D?h(N+1)?!0:(e&&y(!0),!1):!1}
  function m(){return"stopped"==C||0>=N||!D?!1:h(N-1)}
  function y(e){return!e&&D?g(!0):(v(),void T.trigger("finished"))}
  function v(e){function t(){Object.keys(L).forEach(function(e){L[e].disconnect(),"source"==e&&(L[e].onaudioprocess=null),delete L[e]})}L.gain&&(L.gain.gain.value=0),b(),e?t():(setTimeout(t,50),i("stopped"))}
  function b(){"undefined"!=typeof G.module&&(M&&(e("Unloading emu instance."),G["delete"](M),M=null),Object.keys(V).forEach(function(t){e("Unloading array: "+t),V[t]=null}),Object.keys(H).forEach(function(t){e("Unloading pointer: "+t),H[t]&&G.module._free(H[t]),H[t]=null}),O=null,multitrack=null)}
  function w(t){e("Error! "+t.message),T.trigger("error",t)}
  var T={};
  n(T);
  var x,_,C,S,k,M,N,P,I,D,O,
      R=["audio/ay","audio/gbs","audio/gym","audio/hes","audio/kss","audio/nsf","audio/nsfe","audio/sap","audio/spc"],
      L={},
      F=0,
      B=2,
      U=4096,
      j="./js/lib/libgme.js",
      V={},
      H={},
      q=2.5,
      G={};
      return (
        G.load=function(e,t,n){var r=this.module.ccall("gme_init_emu_with_data","number",["number","number","number"],[e,t,n]);return r},
        G.start=function(e,t){return this.module.ccall("gme_start_track","number",["number","number"],[e,t])},
        G.get_length=function(e,t){return this.module.ccall("gme_track_length","number",["number","number"],[e,t])},
        G.tell=function(e){return this.module.ccal("gme_tell","number",["number"],[e])},
        G.fade_at=function(e,t){return this.module.ccall("gme_set_fade","number",["number","number"],[e,t])},
        G.ended=function(e,t,n){return this.module.ccall("gme_track_ended","number",["number"],[e])},
        G["delete"]=function(e){return this.module.ccall("gme_delete","void",["number"],[e])},
        T.init=t,
        T.status=r,
        T.play=o,
        T.stop=u,
        T.pause=l,
        T.resume=c,
        T.types=R,
        T.prev_track=m,
        T.next_track=g,
        T
      )
  
}(this),

D=function(){
  function t(e,t){var e="[PSF] "+e;return t?console.log(e,t):console.log(e)}
  function r(e,t){return C=e,S=t,this}
  function i(t){return q?t():void e(H,{responseType:"arraybuffer"},function(e,n,r){if(e||!r)return t(new Error("Unable to get file: "+H));T(H,r);W.module.ccall("psf_init_and_load_bios",["number"],["string"],[H]);q=!0,t()})}
  function o(){return k}
  function a(e){k=e,t("Current status: "+k),_.trigger(k,R.source,C)}
  function s(e){u(e.data)}
  function u(e){return"loading"==k?t("Already loading a song!"):"crashed"==k?t("Crashed. Cannot continue."):(v(!0),a("loading"),void A(V,function(t){return t?w(t):(W.module=PSFModule,Module=null,void i(function(t){t||h(e)}))}))}
  function l(){return"stopped"==k?t("Already stopped."):(v(),void _.trigger("stopped"))}
  function c(){return"playing"!=k?t("Trying to pause, but currently "+k):(N=new Date,a("paused"),void R.source.disconnect())}
  function f(){if("playing"==k)return t("Trying to resume, but currently "+k);var e=(new Date-N)/1e3;L+=e,R.source.connect(R.gain),a("playing")}
  function h(e){if(R.source)return t("Already playing!");if("loading"!=k)return t("Status changed. Current: "+k),b();I="song.psf",T(I,e);try{D=W.module.ccall("psf_play",["number"],["string"],[I])}catch(n){return w(new Error("Unable to load song. Possibly file or memory error.")),console.log(n),v(),void a("crashed")}return D?(P=W.module.ccall("psf_get_length",["number"],[],[]),P||(P=12e4),_.trigger("length",P/1e3),g(),R.source=C.createScriptProcessor(B,1,2),R.source.onaudioprocess=p,R.gain=C.createGain(),R.gain.gain.value=U,R.source.connect(R.gain),R.gain.connect(S),M=C.currentTime,L=0,d(P,M),void a("playing")):(t("Loading failed."),v())}
  function d(e,t){var n=e/1e3,r=10;R.gain.gain.linearRampToValueAtTime(U,t+n-r),R.gain.gain.linearRampToValueAtTime(0,t+n)}
  function p(e){if("playing"!=k)return t("Not playing chunk, status is "+k);var n=C.currentTime-M-L;if(1e3*n>P)return m(e.outputBuffer),y();_.trigger("progress",n);for(var r=z.shift(),i=0;F>i;i++)e.outputBuffer.getChannelData(i).set(r.getChannelData(i));!function(){g()}()}
  function g(){$.samples||($.samples=W.module._malloc(4*B),G.samples=new Int16Array(W.module.HEAP16.buffer,$.samples,2*B));var e=W.module.ccall("psf_read_data",["number"],["number","number","number"],[D,$.samples,B]);if(!e)return t("Song ended.");for(var n=C.createBuffer(F,B,32e3),r=0;F>r;r++)for(var i=n.getChannelData(r),o=0;B>o;o++)i[o]=G.samples[r+2*o]/j;z.push(n)}
  function m(e){for(var t=0;t<e.numberOfChannels;t++)for(var n=e.getChannelData(t),r=0;r<e.length;r++)n[r]=0}
  function y(){v(!0),_.trigger("finished")}
  function v(e){function t(){Object.keys(R).forEach(function(e){R[e].disconnect(),"source"==e&&(R[e].onaudioprocess=null),delete R[e]})}R.gain&&(R.gain.gain.cancelScheduledValues(0),R.gain.gain.value=0),b(),e?t():(setTimeout(t,50),a("stopped"))}
  function b(){"undefined"!=typeof W.module&&(I&&(x(I),I=null),z.length=0,D&&(t("Unloading state."),D=null),Object.keys(G).forEach(function(e){t("Unloading array: "+e),G[e]=null}),Object.keys($).forEach(function(e){t("Unloading pointer: "+e),W.module._free($[e]),$[e]=null}))}
  function w(e){t("Error! "+e.message),_.trigger("error",e)}
  function T(e,n){var n=n.length?n:new Int8Array(n);t("Writing "+n.length+" bytes as file: "+e),W.module.FS_createDataFile("/",e,n,!0,!0)}
  function x(e){W.module.FS_unlink(e)}var _={};n(_);var C,S,k,M,N,P,I,D,O=["audio/psf","audio/psf2"],R={},L=0,F=2,B=8192,U=3,j=Math.pow(2,15),V="./js/lib/libpsf.js",H="./hebios.bin",q=!1,G={},$={},z=[],W={};return _.init=r,_.status=o,_.play=s,_.stop=l,_.pause=c,_.resume=f,_.types=O,_
}(this),

O=function(){
  function t(e,t){var e="[USF] "+e;return t?console.log(e,t):console.log(e)}
  function r(e,t){return C=e,S=t,this}
  function i(){return k}
  function o(e){k=e,t("Current status: "+k),_.trigger(k,O.source,C)}
  function a(t,n){V.usflib=t,e(t,{responseType:"arraybuffer"},function(e,r,i){return e||!i?n(new Error("Unable to get file: "+bios_path)):(T(t,i),void n())})}
  function s(e){u(e.data,e.lib)}
  function u(e,n){return"loading"==k?t("Already loading a song!"):"crashed"==k?t("Crashed. Cannot continue."):(v(!0),o("loading"),void A(j,function(t){return t?w(t):(z.module=USFModule,Module=null,n?void a("./"+n,function(t){return t?y():void h(e)}):h(e))}))}
  function l(){return"stopped"==k?t("Already stopped."):(v(),void _.trigger("stopped"))}
  function c(){return"playing"!=k?t("Trying to pause, but currently "+k):(N=new Date,o("paused"),void O.source.disconnect())}
  function f(){if("playing"==k)return t("Trying to resume, but currently "+k);var e=(new Date-N)/1e3;R+=e,O.source.connect(O.gain),o("playing")}
  function h(e){if(O.source)return t("Already playing!");if("loading"!=k)return t("Status changed. Current: "+k),b();V.song="song.usf",T(V.song,e);try{I=z.module.ccall("usf_load",["number"],["string","number"],[V.song,G])}catch(n){return w(new Error("Unable to load song. Possibly file or memory error.")),console.log(n),v(),void o("crashed")}return I?(P=z.module.ccall("usf_get_length",["number"],["number"],[I]),P||(P=12e4),_.trigger("length",P/1e3),g(),O.source=C.createScriptProcessor(F,1,2),O.source.onaudioprocess=p,O.gain=C.createGain(),O.gain.gain.value=B,O.source.connect(O.gain),O.gain.connect(S),M=C.currentTime,R=0,d(P,M),void o("playing")):(t("Loading failed."),v())}
  function d(e,t){var n=e/1e3,r=10;O.gain.gain.linearRampToValueAtTime(B,t+n-r),O.gain.gain.linearRampToValueAtTime(0,t+n)}
  function p(e){if("playing"!=k)return t("Not playing chunk, status is "+k);var n=C.currentTime-M-R;if(1e3*n>P)return m(e.outputBuffer),y();_.trigger("progress",n);for(var r=$.shift(),i=0;L>i;i++)e.outputBuffer.getChannelData(i).set(r.getChannelData(i));!function(){g()}()}
  function g(){q.samples||(q.samples=z.module._malloc(4*F),H.samples=new Int16Array(z.module.HEAP16.buffer,q.samples,2*F));var e=z.module.ccall("usf_play",["number"],["number","number","number","number"],[I,q.samples,F,44100]);if(!e)return t("Song ended.");for(var n=C.createBuffer(L,F,44100),r=0;L>r;r++)for(var i=n.getChannelData(r),o=0;F>o;o++)i[o]=H.samples[r+2*o]/U;$.push(n)}
  function m(e){for(var t=0;t<e.numberOfChannels;t++)for(var n=e.getChannelData(t),r=0;r<e.length;r++)n[r]=0}
  function y(){v(!0),_.trigger("finished")}
  function v(e){function t(){Object.keys(O).forEach(function(e){O[e].disconnect(),"source"==e&&(O[e].onaudioprocess=null),delete O[e]})}O.gain&&(O.gain.gain.cancelScheduledValues(0),O.gain.gain.value=0),b(),e?t():(setTimeout(t,50),o("stopped"))}
  function b(){"undefined"!=typeof z.module&&($.length=0,I&&(t("Unloading state."),z.module.ccall("usf_unload",["number"],["number"],[I]),I=null),Object.keys(V).forEach(function(e){V[e]&&x(V[e]),V[e]=null}),Object.keys(H).forEach(function(e){t("Unloading array: "+e),H[e]=null}),Object.keys(q).forEach(function(e){t("Unloading pointer: "+e),z.module._free(q[e]),q[e]=null}))}
  function w(e){t("Error! "+e.message),_.trigger("error",e)}
  function T(e,n){var n=n.length?n:new Int8Array(n);t("Writing "+n.length+" bytes as file: "+e),z.module.FS_createDataFile("/",e,n,!0,!0)}
  function x(e){t("Removing file: "+e),z.module.FS_unlink(e)}
  var _={};
      n(_);
      var C,S,k,M,N,P,I,
      D=["audio/usf","audio/miniusf"],
      O={},
      R=0,
      L=2,
      F=8192,
      B=3,
      U=Math.pow(2,15),
      j="./js/lib/libusf.js",
      V={},
      H={},
      q={},
      G=1,
      $=[],
      z={};
  return (
    _.init=r,
    _.status=i,
    _.play=s,
    _.stop=l,
    _.pause=c,
    _.resume=f,
    _.types=D,
    _
  )
}(this),

R=function(){
  function e(e,t){var e="[VGM] "+e;return t?console.log(e,t):console.log(e)}
  function t(e,t){return b=e,w=t,this}
  function r(){return T}
  function i(t){T=t,e("Current status: "+T),v.trigger(T,N.source,b)}
  function o(e){a(e.data,e.type)}
  function a(t,n){return"loading"==T?e("Already loading a song!"):"crashed"==T?e("Crashed. Cannot continue."):(g(!0),i("loading"),void A(O,function(e){return e?y(e):(F.module=VGMModule,Module=null,void c(t))}))}
  function s(){return"stopped"==T?e("Already stopped."):(g(),void v.trigger("stopped"))}
  function u(){return"playing"!=T?e("Trying to pause, but currently "+T):(_=new Date,i("paused"),void N.source.disconnect())}
  function l(){if("playing"==T)return e("Trying to resume, but currently "+T);var t=(new Date-_)/1e3;P+=t,N.source.connect(N.gain),i("playing")}
  function c(t,n){return N.source?e("Already playing!"):"loading"!=T?(e("Status changed. Current: "+T),m()):(R.file=t.length?t:new Int8Array(t),L.file=F.module._malloc(R.file.length),F.module.writeArrayToMemory(R.file,L.file),(C=F.load(L.file,R.file.length,b.sampleRate))?(L.samples=F.module._malloc(4*I),R.samples=new Int16Array(F.module.HEAP16.buffer,L.samples,2*I),N.source=b.createScriptProcessor(I,1,2),N.source.onaudioprocess=h,N.gain=b.createGain(),N.gain.gain.value=D,N.source.connect(N.gain),N.gain.connect(w),f(0),x=b.currentTime,P=0,void i("playing")):(y(new Error("Unable to load song. Possibly invalid file.")),g(),void i("crashed")))}
  function f(t){S=t;var n=F.start(C,S);return n?p():(k=F.get_length(C,S),-1==k&&(k=12e4),v.trigger("length",k/1e3),k>3e4&&F.fade_at(C,k-1e4,8e3),void e("Playing track number "+S))}
  function h(t){if("playing"!=T)return e("Not playing chunk, status is "+T);var n=b.currentTime-x-P;if(v.trigger("progress",n),1e3*n>k)return d(t.outputBuffer),p();if(1==F.ended(C))return d(t.outputBuffer),void f(S+1);var r=F.play(C,2*I,L.samples);if(r)return d(t.outputBuffer),g();for(var i=0;i<t.outputBuffer.numberOfChannels;i++)for(var o=t.outputBuffer.getChannelData(i),a=0,s=t.outputBuffer.length;s>a;a++)o[a]=R.samples[i+2*a]/32768}
  function d(e){for(var t=0;t<e.numberOfChannels;t++)for(var n=e.getChannelData(t),r=0,i=e.length;i>r;r++)n[r]=0}
  function p(){g(!0),v.trigger("finished")}
  function g(e){function t(){Object.keys(N).forEach(function(e){N[e].disconnect(),"source"==e&&(N[e].onaudioprocess=null),delete N[e]})}N.gain&&(N.gain.gain.value=0),m(),e?t():(setTimeout(t,50),i("stopped"))}
  function m(){"undefined"!=typeof F.module&&(C&&(e("Unloading emu instance."),F["delete"](C),C=null),Object.keys(R).forEach(function(t){e("Unloading array: "+t),R[t]=null}),Object.keys(L).forEach(function(t){e("Unloading pointer: "+t),F.module._free(L[t]),L[t]=null}))}
  function y(t){e("Error! "+t.message),v.trigger("error",t)}
  var v={};
  n(v);
  var b,w,T,x,_,C,S,k,
      M=["audio/vgm","audio/vgz"],
      N={},
      P=0,
      I=4096,
      D=1.2,
      O="./js/lib/libvgm.js",
      R={},
      L={},
      F={};
      return (
        F.load=function(e,t,n){var r=this.module.ccall("gme_init_emu_with_data","number",["number","number","number"],[e,t,n]);return r},
        F.start=function(e,t){return this.module.ccall("gme_start_track","number",["number","number"],[e,t])},
        F.set_eq=function(e,t){return this.module.ccall("gme_update_equalizer","void",["number","number","number"],[C,e,t])},
        F.get_length=function(e,t){return this.module.ccall("gme_track_length","number",["number","number"],[e,t])},
        F.tell=function(e){return this.module.ccal("gme_tell","number",["number"],[e])},
        F.fade_at=function(e,t,n){return this.module.ccall("gme_set_fade","number",["number","number","number"],[e,t,n])},
        F.play=function(e,t,n){return this.module.ccall("gme_play","number",["number","number","number"],[e,t,n])},
        F.ended=function(e,t,n){return this.module.ccall("gme_track_ended","number",["number"],[e])},
        F["delete"]=function(e){return this.module.ccall("gme_delete","void",["number"],[e])},
        v.init=t,
        v.status=r,
        v.play=o,
        v.stop=s,
        v.pause=u,
        v.resume=l,
        v.types=M,
        v
      )
}(this),

L=function(){
  function e(e,t){var e="[MDX] "+e;return t?console.log(e,t):console.log(e)}
  function t(e,t){return T=e,x=t,this}
  function r(){return _}
  function i(t){_=t,e("Current status: "+_),w.trigger(_,N.source,T)}
  function o(e){a(e)}
  function a(t){return"loading"==_?e("Already loading a song!"):"crashed"==_?e("Crashed. Cannot continue."):(g(!0),i("loading"),void A(F,function(e){return e?y(e):(B.module=MDXModule,Module=null,void c(t))}))}
  function s(){return"stopped"==_?e("Already stopped."):(g(),void w.trigger("stopped"))}
  function u(){return"playing"!=_?e("Trying to pause, but currently "+_):(S=new Date,i("paused"),void N.source.disconnect())}
  function l(){if("playing"==_)return e("Trying to resume, but currently "+_);var t=(new Date-S)/1e3;P+=t,N.source.connect(N.gain),i("playing")}
  function c(t){if(N.source)return e("Already playing!");if("loading"!=_)return e("Status changed. Current: "+_),m();v("song.mdx",t.data),t.lib&&t.lib.data&&v(t.lib.name,t.lib.data);var n;try{n=B.module._load(44100)}catch(r){return y(new Error("Unable to load song. Possibly file or memory error.")),console.error(r),g(),void i("crashed")}return 0>=n?(e("Loading failed."),p()):(k=1e3*n,w.trigger("length",n),L.samples=B.module._malloc(4*I),R.samples=new Int16Array(B.module.HEAP16.buffer,L.samples,2*I),N.source=T.createScriptProcessor(I,1,2),N.source.onaudioprocess=h,N.gain=T.createGain(),N.gain.gain.value=D,N.source.connect(N.gain),N.gain.connect(x),C=T.currentTime,P=0,k>1e5&&f(k,C),void i("playing"))}
  function f(e,t){var n=e/1e3,r=10;N.gain.gain.linearRampToValueAtTime(D,t+n-r),N.gain.gain.linearRampToValueAtTime(0,t+n)}
  function h(t){if("playing"!=_)return e("Not playing chunk, status is "+_);var n=T.currentTime-C-P;w.trigger("progress",n);var r=B.module._render(L.samples,I);if(0>r)return d(t.outputBuffer),p();for(var i=0;i<t.outputBuffer.numberOfChannels;i++)for(var o=t.outputBuffer.getChannelData(i),a=0,s=t.outputBuffer.length;s>a;a++)o[a]=R.samples[i+2*a]/32768}
  function d(e){for(var t=0;t<e.numberOfChannels;t++)for(var n=e.getChannelData(t),r=0;r<e.length;r++)n[r]=0}
  function p(){g(!0),w.trigger("finished")}
  function g(e){function t(){Object.keys(N).forEach(function(e){N[e].disconnect(),"source"==e&&(N[e].onaudioprocess=null),delete N[e]})}N.gain&&(N.gain.gain.cancelScheduledValues(0),N.gain.gain.value=0),m(),e?t():(setTimeout(t,50),i("stopped"))}
  function m(){"undefined"!=typeof B.module&&(B.module._unload(),O.forEach(b),O=[],Object.keys(R).forEach(function(t){e("Unloading array: "+t),R[t]=null}),Object.keys(L).forEach(function(t){e("Unloading pointer: "+t),B.module._free(L[t]),L[t]=null}))}
  function y(t){e("Error! "+t.message),w.trigger("error",t)}
  function v(t,n){O.push(t);var n=n.length?n:new Int8Array(n);e("Writing "+n.length+" bytes as file: "+t),B.module.FS_createDataFile("/",t,n,!0,!0)}
  function b(e){B.module.FS_unlink(e)}
  var w={};
  n(w);
  var T,x,_,C,S,k,
      M=["audio/mdx"],
      N={},
      P=0,
      I=4096,
      D=2,
      O=[],
      R={},
      L={},
      F="./js/lib/libmdxmini.js",
      B={};
  return (
    w.init=t,
    w.status=r,
    w.play=o,
    w.stop=s,
    w.pause=u,
    w.resume=l,
    w.types=M,
    w
  )
}(this),

F=function(){
  function e(e,t){var e="[SID] "+e;return t?console.log(e,t):console.log(e)}
  function t(e,t){return y=e,v=t,this}
  function r(){return b}
  function i(t){b=t,e("Current status: "+b),m.trigger(b,x?x.source:null,y)}
  function o(e){a(e)}
  function a(t){return"loading"==b?e("Already loading a song!"):"crashed"==b?e("Crashed. Cannot continue."):(d(!0),i("loading"),void A(I,function(e){return e?g(e):void c(t)}))}
  function s(){return"stopped"==b?e("Already stopped."):(d(),void m.trigger("stopped"))}
  function u(){return"playing"!=b?e("Trying to pause, but currently "+b):(T=new Date,i("paused"),void x.disconnect())}
  function l(){if("playing"==b)return e("Trying to resume, but currently "+b);var t=(new Date-T)/1e3;k+=t,x.connect(S.gain),i("playing")}
  function c(t){if(S.source)return e("Already playing!");if("loading"!=b)return e("Status changed. Current: "+b),p();x=new JSSid(y,M,N);x.load(new Uint8Array(t.data));_||(_=12e4),m.trigger("length",_/1e3),x.play(0,_/1e3),S.gain=y.createGain(),S.gain.gain.value=P,x.connect(S.gain),S.gain.connect(v),w=y.currentTime,k=0,i("playing");var n=0;x.onplay(function(){n=y.currentTime-w-k,m.trigger("progress",n)}),f(_,w),x.onfinished(h)}
  function f(e,t){var n=e/1e3,r=10;S.gain.gain.linearRampToValueAtTime(P,t+n-r),S.gain.gain.linearRampToValueAtTime(0,t+n)}
  function h(){d(!0),m.trigger("finished")}
  function d(e){function t(){Object.keys(S).forEach(function(e){S[e].disconnect(),delete S[e]}),p()}S.gain&&(S.gain.gain.cancelScheduledValues(0),S.gain.gain.value=0),x&&(x.stop(),x.onfinished(null)),e?t():(setTimeout(t,50),i("stopped"))}
  function p(){x&&x.unload(),x=null}
  function g(t){e("Error! "+t.message),m.trigger("error",t)}var m={};n(m);var y,v,b,w,T,x,_,C=["audio/sid"],S={},k=0,M=4096,N=5e-4,P=2,I="./js/lib/jssid.min.js";return m.init=t,m.status=r,m.play=o,m.stop=s,m.pause=u,m.resume=l,m.types=C,m
}(),

B=function(){
  function e(e,t){var e="[PC98] "+e;return t?console.log(e,t):console.log(e)}
  function t(e,t){return v=e,b=t,this}
  function r(){return w}
  function i(t){w=t,e("Current status: "+w),y.trigger(w,S.source,v)}
  function o(e){a(e)}
  function a(t){return"loading"==w?e("Already loading a song!"):"crashed"==w?e("Crashed. Cannot continue."):(p(!0),i("loading"),void A(O,function(e){return e?m(e):(R.module=PC98Module,Module=null,void c(t))}))}
  function s(){return"stopped"==w?e("Already stopped."):(p(),void y.trigger("stopped"))}
  function u(){return"playing"!=w?e("Trying to pause, but currently "+w):(x=new Date,i("paused"),void S.source.disconnect())}
  function l(){if("playing"==w)return e("Trying to resume, but currently "+w);var t=(new Date-x)/1e3;k+=t,S.source.connect(S.gain),i("playing")}
  function c(t){if(S.source)return e("Already playing!");if("loading"!=w)return e("Status changed. Current: "+w),g();I.file=new Uint8Array(t.data),D.file=R.module._malloc(I.file.length),R.module.writeArrayToMemory(I.file,D.file);var n;try{n=R.module._load(D.file,I.file.length,v.sampleRate,P)}catch(r){return m(new Error("Unable to load song. Possibly file or memory error.")),console.error(r),p(),void i("crashed")}return 0>n?(e("Loading failed."),d()):(_=n,y.trigger("length",_/1e3),D.samples=R.module._malloc(4*M),I.samples=new Int16Array(R.module.HEAP16.buffer,D.samples,2*M),S.source=v.createScriptProcessor(M,1,2),S.source.onaudioprocess=f,S.gain=v.createGain(),S.gain.gain.value=N,S.source.connect(S.gain),S.gain.connect(b),T=v.currentTime,k=0,void i("playing"))}
  function f(t){if("playing"!=w)return e("Not playing chunk, status is "+w);var n=v.currentTime-T-k;y.trigger("progress",n);var r=R.module._render(D.samples,M);if(0>=r)return h(t.outputBuffer),d();for(var i=0;i<t.outputBuffer.numberOfChannels;i++)for(var o=t.outputBuffer.getChannelData(i),a=0,s=t.outputBuffer.length;s>a;a++)o[a]=I.samples[i+2*a]/32768}
  function h(e){for(var t=0;t<e.numberOfChannels;t++)for(var n=e.getChannelData(t),r=0;r<e.length;r++)n[r]=0}
  function d(){p(!0),y.trigger("finished")}
  function p(e){function t(){Object.keys(S).forEach(function(e){S[e].disconnect(),"source"==e&&(S[e].onaudioprocess=null),delete S[e]})}S.gain&&(S.gain.gain.value=0),g(),e?t():(setTimeout(t,50),i("stopped"))}
  function g(){"undefined"!=typeof R.module&&(R.module._unload(),Object.keys(I).forEach(function(t){e("Unloading array: "+t),I[t]=null}),Object.keys(D).forEach(function(t){e("Unloading pointer: "+t),R.module._free(D[t]),D[t]=null}))}
  function m(t){e("Error! "+t.message),y.trigger("error",t)}var y={};n(y);var v,b,w,T,x,_,C=["audio/s98","audio/mym"],S={},k=0,M=4096,N=3,P=2,I={},D={},O="./js/lib/libpc98.js",R={};return y.init=t,y.status=r,y.play=o,y.stop=s,y.pause=u,y.resume=l,y.types=C,y
}(this),

U=function(){
  function e(e,t){var e="[SC68] "+e;return t?console.log(e,t):console.log(e)}
  function t(e,t){return b=e,w=t,this}
  function r(){return T}
  function i(t){T=t,e("Current status: "+T),v.trigger(T,k.source,b)}
  function o(e){a(e)}
  function a(t){return"loading"==T?e("Already loading a song!"):"crashed"==T?e("Crashed. Cannot continue."):(g(!0),i("loading"),void A(O,function(e){return e?y(e):(R.module=SC68Module,Module=null,void c(t))}))}
  function s(){return"stopped"==T?e("Already stopped."):(g(),void v.trigger("stopped"))}
  function u(){return"playing"!=T?e("Trying to pause, but currently "+T):(_=new Date,i("paused"),void k.source.disconnect())}
  function l(){if("playing"==T)return e("Trying to resume, but currently "+T);var t=(new Date-_)/1e3;M+=t,k.source.connect(k.gain),i("playing")}
  function c(t){if(k.source)return e("Already playing!");if("loading"!=T)return e("Status changed. Current: "+T),m();I.file=new Uint8Array(t.data),D.file=R.module._malloc(I.file.length),R.module.writeArrayToMemory(I.file,D.file);var n;try{n=R.module._load(b.sampleRate,D.file,I.file.length)}catch(r){return y(new Error("Unable to load song. Possibly file or memory error.")),console.error(r),g(),void i("crashed")}return 0>n?(e("Loading failed."),p()):(C=0==n?12e4:n,v.trigger("length",C/1e3),D.samples=R.module._malloc(4*P),I.samples=new Int16Array(R.module.HEAP16.buffer,D.samples,2*P),k.source=b.createScriptProcessor(P,1,2),k.source.onaudioprocess=h,k.gain=b.createGain(),k.gain.gain.value=N,k.source.connect(k.gain),k.gain.connect(w),x=b.currentTime,M=0,0==n&&f(C,x),void i("playing"))}
  function f(e,t){var n=e/1e3,r=10;k.gain.gain.linearRampToValueAtTime(N,t+n-r),k.gain.gain.linearRampToValueAtTime(0,t+n)}
  function h(t){if("playing"!=T)return e("Not playing chunk, status is "+T);var n=b.currentTime-x-M;if(1e3*n>C)return d(t.outputBuffer),p();v.trigger("progress",n);var r=R.module._render(D.samples,P);if(0>r||r>4)return d(t.outputBuffer),p();for(var i=0;i<t.outputBuffer.numberOfChannels;i++)for(var o=t.outputBuffer.getChannelData(i),a=0,s=t.outputBuffer.length;s>a;a++)o[a]=I.samples[i+2*a]/32768}
  function d(e){for(var t=0;t<e.numberOfChannels;t++)for(var n=e.getChannelData(t),r=0;r<e.length;r++)n[r]=0}
  function p(){g(!0),v.trigger("finished")}
  function g(e){function t(){Object.keys(k).forEach(function(e){k[e].disconnect(),"source"==e&&(k[e].onaudioprocess=null),delete k[e]})}k.gain&&(k.gain.gain.cancelScheduledValues(0),k.gain.gain.value=0),m(),e?t():(setTimeout(t,100),i("stopped"))}
  function m(){"undefined"!=typeof R.module&&(R.module._unload(),Object.keys(I).forEach(function(t){e("Unloading array: "+t),I[t]=null}),Object.keys(D).forEach(function(t){e("Unloading pointer: "+t),R.module._free(D[t]),D[t]=null}))}
  function y(t){e("Error! "+t.message),v.trigger("error",t)}var v={};n(v);var b,w,T,x,_,C,S=["audio/sndh"],k={},M=0,N=1.5,P=4096,I={},D={},O="./js/lib/libsc68.js",R={};return v.init=t,v.status=r,v.play=o,v.stop=s,v.pause=u,v.resume=l,v.types=S,v
}(this),

j=function(){
  function t(e,t){var e="[AdPlug] "+e;return t?console.log(e,t):console.log(e)}
  function r(e,t){return C=e,S=t,this}
  function i(){return k}
  function o(e){k=e,t("Current status: "+k),_.trigger(k,O.source,C)}
  function a(t){function n(r){var i=j[Object.keys(j)[r]];return i?void e("./res"+i,{responseType:"arraybuffer"},function(e,o,a){return e||!a?t(new Error("Unable to get file: "+i)):(T(i,a),void n(r+1))}):t()}n(0)}
  function s(e){var t=e.file||e.name||"song."+e.type.replace("audio/",""),n=t.replace(/.*\./,"");P=H[n]||V,t.match("spear-of-destiny")&&(P*=1.8),u(e.data,t)}
  function u(e,n){return"loading"==k?t("Already loading a song!"):"crashed"==k?t("Crashed. Cannot continue."):(v(!0),o("loading"),void A(B,function(t){return t?w(t):(U.module=AdPlugModule,Module=null,j.loaded?h(e,n):void a(function(t){return t?w():(j.loaded=!0,void h(e,n))}))}))}
  function l(){return"stopped"==k?t("Already stopped."):(v(),void _.trigger("stopped"))}
  function c(){return"playing"!=k?t("Trying to pause, but currently "+k):(N=new Date,o("paused"),void O.source.disconnect())}
  function f(){if("playing"==k)return t("Trying to resume, but currently "+k);var e=(new Date-N)/1e3;R+=e,O.source.connect(O.gain),o("playing")}
  function h(e,n){if(O.source)return t("Already playing!");if("loading"!=k)return t("Status changed. Current: "+k),b();$.song=n,T(n,e);try{q=U.module.ccall("load","bool",["number","string","string"],[C.sampleRate,$.song,j.adplug])}catch(r){return w(new Error("Unable to load song. Possibly file or memory error.")),console.log(r),v(),void o("crashed")}return 0>q?(t("Loading failed."),w(new Error("Unable to initialize AdPlug."))):(O.source=C.createScriptProcessor(F,1,2),O.source.onaudioprocess=p,O.gain=C.createGain(),O.gain.gain.value=P,O.source.connect(O.gain),O.gain.connect(S),M=C.currentTime,R=0,d(1),void g())}
  function d(e){return e>q?y():(G=e,U.module._set_song(G),I=U.module._get_length(),0==I?d(e+1):(_.trigger("length",I/1e3),t("Playing song "+G+" of "+q+", length: "+I),M=C.currentTime,R=0,void o("playing")))}
  function p(e){if("playing"!=k)return t("Not playing chunk, status is "+k);var n=C.currentTime-M-R;if(1e3*n>I)return t("Past song length, song finished."),m(e.outputBuffer),y();_.trigger("progress",n);var r=X.shift();if(!r)return t("No available buffers."),m(e.outputBuffer),void y();for(var i=0;L>i;i++)e.outputBuffer.getChannelData(i).set(r.getChannelData(i));!function(){g()}()}
  function g(){W.samples||(W.samples=U.module._malloc(4*F),z.samples=new Int16Array(U.module.HEAP16.buffer,W.samples,2*F));var e,t=U.module.ccall("render_frames","number",["number","number","number"],[C.sampleRate,W.samples,F]),n=C.createBuffer(L,F,C.sampleRate);if(0>=t)return m(n),X.push(n);for(var r=0;L>r;r++){var i=n.getChannelData(r);for(e=0;F>e;e++)i[e]=z.samples[r+2*e]/32768}X.push(n)}
  function m(e){var t,n,r=e.length;for(n=0;n<e.numberOfChannels;n++){var i=e.getChannelData(n);for(t=0;r>t;t++)i[t]=0}}
  function y(){return q>G?(t("Song finished. Trying next track: "+(G+1)),d(G+1)):(v(!0),void _.trigger("finished"))}
  function v(e){function t(){Object.keys(O).forEach(function(e){O[e].disconnect(),"source"==e&&(O[e].onaudioprocess=null),delete O[e]})}O.gain&&(O.gain.gain.value=0),b(),e?t():(setTimeout(t,50),o("stopped"))}
  function b(){"undefined"!=typeof U.module&&(t("Clearing buffers"),X.length=0,q>0&&(t("Unloading emu."),U.module._unload(),q=-1),Object.keys($).forEach(function(e){$[e]&&x($[e]),$[e]=null}),Object.keys(z).forEach(function(e){t("Unloading array: "+e),z[e]=null}),Object.keys(W).forEach(function(e){t("Unloading pointer: "+e),U.module._free(W[e]),W[e]=null}))}
  function w(e){t("Error! "+e.message),_.trigger("error",e)}
  function T(e,n){var n=n.length?n:new Int8Array(n);t("Writing "+n.length+" bytes as file: "+e),U.module.FS_createDataFile("/",e,n,!0,!0)}
  function x(e){t("Removing file: "+e),U.module.FS_unlink(e)}var _={};n(_);var C,S,k,M,N,P,I,D=["audio/hsc","audio/sng","audio/imf","audio/wlf","audio/adlib","audio/a2m","audio/sng","audio/amd","audio/bam","audio/cmf","audio/mdi","audio/d00","audio/dfm","audio/hsp","audio/ksm","audio/mad","audio/midi-adplug","audio/sci","audio/laa","audio/mkj","audio/cff","audio/dmo","audio/s3m-adlib","audio/dtm","audio/sng","audio/mtk","audio/rad","audio/raw","audio/sat","audio/sa2","audio/xad","audio/xad","audio/lds","audio/m","audio/rol","audio/xsm","audio/dro","audio/msc","audio/rix","audio/adl","audio/jbm"],O={},R=0,L=2,F=2048,B="./js/lib/libadplug.js",U={},j={ksm:"./insts.dat",rol:"./standard.bnk",adplug:"./adplug.db"},V=1.2,H={imf:1.5,laa:1,raw:.65},q=-1,G=-1,$={},z={},W={},X=[];return _.init=r,_.status=i,_.play=s,_.stop=l,_.pause=c,_.resume=f,_.types=D,_
}(this),

V=function(){
  function e(e,t){var e="[AdlMidi] "+e;return t?console.log(e,t):console.log(e)}
  function t(e,t){return x=e,_=t,this}
  function r(){return C}
  function i(t){C=t,e("Current status: "+C),T.trigger(C,P.source,x)}
  function o(e,t){var n="song.mid";t&&(M=1e3*t.length()),a(e.data,n)}
  function a(t,n){return"loading"==C?e("Already loading a song!"):"crashed"==C?e("Crashed. Cannot continue."):(m(!0),i("loading"),void A(F,function(e){return e?v(e):(B.module=AdlMidiModule,Module=null,void c(t,n))}))}
  function s(){return"stopped"==C?e("Already stopped."):(m(),void T.trigger("stopped"))}
  function u(){return"playing"!=C?e("Trying to pause, but currently "+C):(k=new Date,i("paused"),void P.source.disconnect())}
  function l(){if("playing"==C)return e("Trying to resume, but currently "+C);var t=(new Date-k)/1e3;I+=t,P.source.connect(P.gain),i("playing")}
  function c(t,n){if(P.source)return e("Already playing!");if("loading"!=C)return e("Status changed. Current: "+C),y();j.song=n,b(n,t);var r;try{r=B.module._init(x.sampleRate,$,G,2,0),r=B.module._load(j.song)}catch(o){return v(new Error("Unable to load song. Possibly file or memory error.")),console.log(o),m(),void i("crashed")}return 0!=r?(e("Loading failed."),v(new Error("Unable to initialize AdlMidi."))):(U=!0,P.source=x.createScriptProcessor(R,1,2),P.source.onaudioprocess=h,P.gain=x.createGain(),P.gain.gain.value=D,P.source.connect(P.gain),P.gain.connect(_),S=x.currentTime,I=0,M?M+=3e3:(M=12e4,f(M,S)),T.trigger("length",M/1e3),d(),void i("playing"))}
  function f(e,t){var n=e/1e3,r=10;P.gain.gain.linearRampToValueAtTime(D,t+n-r),P.gain.gain.linearRampToValueAtTime(0,t+n)}
  function h(t){if("playing"!=C)return e("Not playing chunk, status is "+C);var n=x.currentTime-S-I;if(1e3*n>M)return p(t.outputBuffer),g();T.trigger("progress",n);var r=q.shift();if(!r)return e("No available buffers."),p(t.outputBuffer),void g();for(var i=0;O>i;i++)t.outputBuffer.getChannelData(i).set(r.getChannelData(i));d()}
  function d(){H.samples||(H.samples=B.module._malloc(8*L),V.samples=new Float32Array(B.module.HEAP32.buffer,H.samples,4*L));for(var e,t,n,r=R/L,i=x.createBuffer(O,R,x.sampleRate),o=i.getChannelData(0),a=i.getChannelData(1),s=0;r>s;s++)for(t=s*L,n=B.module._render(L,H.samples),e=0;R>e;e++)o[e+t]=V.samples[0+2*e],a[e+t]=V.samples[1+2*e];q.push(i)}
  function p(e){var t,n,r=e.length;for(n=0;n<e.numberOfChannels;n++){var i=e.getChannelData(n);for(t=0;r>t;t++)i[t]=0}}
  function g(){m(!0),T.trigger("finished")}
  function m(e){function t(){Object.keys(P).forEach(function(e){P[e].disconnect(),"source"==e&&(P[e].onaudioprocess=null),delete P[e]})}P.gain&&(P.gain.gain.cancelScheduledValues(0),P.gain.gain.value=0),y(),e?t():(setTimeout(t,50),i("stopped"))}
  function y(){"undefined"!=typeof B.module&&(e("Clearing buffers."),q.length=0,U&&(e("Unloading emu."),B.module.ccall("unload",[],[],[]),U=!1),Object.keys(j).forEach(function(e){j[e]&&w(j[e]),j[e]=null}),Object.keys(V).forEach(function(t){e("Unloading array: "+t),V[t]=null}),Object.keys(H).forEach(function(t){e("Unloading pointer: "+t),B.module._free(H[t]),H[t]=null}))}
  function v(t){e("Error! "+t.message),T.trigger("error",t)}
  function b(t,n){var n=n.length?n:new Int8Array(n);e("Writing "+n.length+" bytes as file: "+t),B.module.FS_createDataFile("/",t,n,!0,!0)}
  function w(t){e("Removing file: "+t),B.module.FS_unlink(t)}var T={};n(T);var x,_,C,S,k,M,N=["audio/midi-adlib"],P={},I=0,D=1.5,O=2,R=4096,L=512,F="./js/lib/libadlmidi.js",B={},U=!1,j={},V={},H={},q=[],G=59,$=0;return T.init=t,T.status=r,T.play=o,T.stop=s,T.pause=u,T.resume=l,T.types=N,T
}(this);
//use ony for chrome browser and windows platform
//"object"==typeof module&&"object"==typeof module.exports&&(module.exports=n);

var H="worker.js",
q=function(e,t){console.log("Initializing worker."),this.data=e,this.worker=new Worker("./assets/tuple/inputs/file/"+H),this.worker.addEventListener("message",this.got_message.bind(this),!1)};
q.prototype.send_message=function(e,t){var n={action:e};t&&(n.data=t),this.worker.postMessage(n)},
q.prototype.got_message=function(e){var t=e.data;"end"==t.event&&this.unload(),this.trigger(t.event,t.data)},
q.prototype.play=function(){this.send_message("play",this.data)},
q.prototype.stop=function(){return this.worker?void this.send_message("stop"):console.log("No worker to stop")},
q.prototype.pause=function(){this.send_message("pause")},
q.prototype.forward=function(){this.send_message("forward")},
q.prototype.previous=function(){this.send_message("previous")},
q.prototype.unload=function(){return this.worker?(console.log("Unloading worker."),this.worker.removeEventListener("message",this.got_message),this.send_message("kill"),void(this.worker=null)):console.log("Already unloaded.")},
n(q.prototype);

var G=2048,
    z=[],
    W={},
    X=0;
u.cancel=function(e){return W[e]?(delete W[e],!0):!1};
var Y={connect:{value:function(){this.output.connect.apply(this.output,arguments)}},disconnect:{value:function(){this.output.disconnect.apply(this.output,arguments)}},wet:{get:function(){return this._wet.gain}},dry:{get:function(){return this._dry.gain}},cutoff:{get:function(){return this._filter.frequency}},filterType:{get:function(){return this._filter.type},set:function(e){this._filter.type=e}},_buildImpulse:{value:function(){var e=this,t=e.context.sampleRate,n=Math.max(t*e.time,1);e._building&&u.cancel(e._building),e._building=u(n,e.decay,e.reverse,function(r){var i=e.context.createBuffer(2,n,t);i.getChannelData(0).set(r[0]),i.getChannelData(1).set(r[1]),e._convolver.buffer=i,e._building=!1})}},time:{enumerable:!0,get:function(){return this._time},set:function(e){this._time=e,this._buildImpulse()}},decay:{enumerable:!0,get:function(){return this._decay},set:function(e){this._decay=e,this._buildImpulse()}},reverse:{enumerable:!0,get:function(){return this._reverse},set:function(e){this._reverse=e,this._buildImpulse()}}},
Q={0:"square",1:"square",2:"square",3:"square",4:"square",5:"square",16:"triangle",17:"triangle",18:"triangle",19:"triangle",20:"triangle",29:"sawtooth",30:"sawtooth",48:"triangle",49:"triangle",50:"triangle",51:"triangle",82:"sawtooth"},Z=this&&this.__extends||function(e,t){function n(){this.constructor=e}for(var r in t)t.hasOwnProperty(r)&&(e[r]=t[r]);n.prototype=t.prototype,e.prototype=new n},K=function(){function e(e,t,n){this.dataView=e,this.tick=t,this.status=n}return e.create=function(e,t,n){this.statusEventMap||(this.statusEventMap={128:ee,144:te,160:ne,176:re,192:ie,208:oe,224:ae,240:ue,255:le});var r=240&n;if(255===n)return le.create(e,t,n);if(144===n&&0===e.getUint8(1))return new ee(e,t,128);var i=this.statusEventMap[r];return i?new i(e,t,n):void console.log("No class for event:",r)},Object.defineProperty(e.prototype,"statusType",{get:function(){return 240&this.status},enumerable:!0,configurable:!0}),e}(),J=function(e){function t(){e.apply(this,arguments)}return Z(t,e),Object.defineProperty(t.prototype,"channel",{get:function(){return 15&this.status},enumerable:!0,configurable:!0}),t}(K),
ee=function(e){function t(){e.apply(this,arguments)}return Z(t,e),Object.defineProperty(t.prototype,"noteNumber",{get:function(){return this.dataView.getUint8(0)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"velocity",{get:function(){return this.dataView.getUint8(1)},enumerable:!0,configurable:!0}),t}(J),
te=function(e){function t(){e.apply(this,arguments)}return Z(t,e),Object.defineProperty(t.prototype,"noteNumber",{get:function(){return this.dataView.getUint8(0)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"velocity",{get:function(){return this.dataView.getUint8(1)},enumerable:!0,configurable:!0}),t}(J),
ne=function(e){function t(){e.apply(this,arguments)}return Z(t,e),t}(J),
re=function(e){function t(){e.apply(this,arguments)}return Z(t,e),Object.defineProperty(t.prototype,"controller",{get:function(){return this.dataView.getUint8(0)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"value",{get:function(){return this.dataView.getUint8(1)},enumerable:!0,configurable:!0}),t}(J),
ie=function(e){function t(){e.apply(this,arguments)}return Z(t,e),Object.defineProperty(t.prototype,"program",{get:function(){return this.dataView.getUint8(0)},enumerable:!0,configurable:!0}),t}(J),
oe=function(e){function t(){e.apply(this,arguments)}return Z(t,e),t}(J),
ae=function(e){function t(){e.apply(this,arguments)}return Z(t,e),Object.defineProperty(t.prototype,"value",{get:function(){return this.dataView.getUint8(0)+(this.dataView.getUint8(1)<<7)-8192},enumerable:!0,configurable:!0}),t}(J),
se=function(e){function t(){e.apply(this,arguments)}return Z(t,e),Object.defineProperty(t.prototype,"statusType",{get:function(){return this.status},enumerable:!0,configurable:!0}),t}(K),
ue=function(e){function t(){e.apply(this,arguments)}return Z(t,e),t}(se),
le=function(e){function t(){e.apply(this,arguments)}return Z(t,e),t.create=function(e,n,r){this.typeIndexEventMap||(this.typeIndexEventMap={81:ce});var i=e.getUint8(0);if(i in this.typeIndexEventMap){var o=this.typeIndexEventMap[i];return new o(e,n,r)}return new t(e,n,r)},Object.defineProperty(t.prototype,"typeIndex",{get:function(){return this.dataView.getUint8(0)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"data",{get:function(){var e=d(this.dataView,1),t=e.value,n=e.byteLength;return f(this.dataView,1+n,t)},enumerable:!0,configurable:!0}),t}(se),
ce=function(e){function t(){e.apply(this,arguments)}return Z(t,e),Object.defineProperty(t.prototype,"rawTempo",{get:function(){return h(this.data,0,!1)},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"secondsPerBeat",{get:function(){return 1e-6*this.rawTempo},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"beatsPerMinute",{get:function(){return 60/this.secondsPerBeat},enumerable:!0,configurable:!0}),t}(le),
fe=function(){function e(){this.listeners=[]}return e.prototype.on=function(e){this.listeners.push(e)},e.prototype.off=function(e){var t=this.listeners.indexOf(e);-1!==t&&this.listeners.splice(t,1)},e.prototype.offAll=function(){this.listeners=[]},e.prototype.emit=function(e){for(var t=0,n=this.listeners;t<n.length;t++){var r=n[t];r(e)}},e}(),
he=function(){function e(e){void 0===e&&(e=440),this._frequencyOf69=e,this._cache={}}return e.prototype.frequency=function(e){if(e in this._cache)return this._cache[e];var t=this._frequencyOf69*Math.pow(2,(e-69)/12);return this._cache[e]=t,t},e}(),
de=function(){function e(e){void 0===e&&(e=16),this.polyphony=e,this._noteStore={},this._noteNumberQueue=[],this._expiredEmitter=new fe}return e.prototype.onExpired=function(e){this._expiredEmitter.on(e)},e.prototype.offExpired=function(e){this._expiredEmitter.off(e)},e.prototype.register=function(e,t,n){var r=this._noteStore[e];if(null!=r){this._expiredEmitter.emit({data:r,time:n});var i=this._noteNumberQueue.indexOf(e);-1!==i&&this._noteNumberQueue.splice(i,1)}for(this._noteStore[e]=t,this._noteNumberQueue.push(e);this._noteNumberQueue.length>this.polyphony;){var o=this._noteNumberQueue.shift();this._expiredEmitter.emit({data:this._noteStore[o],time:n}),this._noteStore[o]=null}},e.prototype.unregister=function(e,t){var n=this._noteStore[e];if(null!=n){this._expiredEmitter.emit({data:n,time:t});var r=this._noteNumberQueue.indexOf(e);-1!==r&&this._noteNumberQueue.splice(r,1)}},e.prototype.unregisterAll=function(e){void 0===e&&(e=0);for(var t=0,n=this._noteNumberQueue;t<n.length;t++){var r=n[t];this._expiredEmitter.emit({data:this._noteStore[r],time:e})}this._noteStore={},this._noteNumberQueue=[]},e.prototype.find=function(e){return this._noteStore[e]},Object.defineProperty(e.prototype,"noteStore",{get:function(){return this._noteStore},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"noteNumberQueue",{get:function(){return this._noteNumberQueue},enumerable:!0,configurable:!0}),e}(),
pe=function(){function e(e,t){this.audioContext=e,this.destination=t,this.notePool=new de,this.notePool.onExpired(this._expiredListener.bind(this)),this._expiredEmitter=new fe,this._programChangeEmitter=new fe,this._panner=this.audioContext.createPanner(),this._gain=this.audioContext.createGain(),this.source=this._panner,this._panner.connect(this._gain),this._gain.connect(t),this.resetAllControl(),this.setPanpot(64)}return e.prototype.resetAllControl=function(){this.volume=100,this.panpot=64,this.expression=127,this.pitchBend=0,this.pitchBendRange=2,this.dataEntry=0,this.rpn=0},e.prototype.destroy=function(){this.notePool.unregisterAll(),this._expiredEmitter.offAll(),this._programChangeEmitter.offAll()},e.prototype.pause=function(){this.notePool.unregisterAll()},e.prototype.setPanpot=function(e){this.panpot=e;var t=(e-64)*Math.PI/128;this._panner.setPosition(Math.sin(t),0,-Math.cos(t))},e.prototype.setVolume=function(e,t){this.volume=e,this._gain.gain.cancelScheduledValues(t),this._gain.gain.setValueAtTime(e/127*this.expression/127,t)},e.prototype.setExpression=function(e,t){this.expression=e,this._gain.gain.cancelScheduledValues(t),this._gain.gain.setValueAtTime(this.volume/127*e/127,t)},Object.defineProperty(e.prototype,"detune",{get:function(){var e=this.pitchBend/8192*this.pitchBendRange*100;return e},set:function(e){this.pitchBend=e/100/this.pitchBendRange*8192},enumerable:!0,configurable:!0}),e.prototype.registerNote=function(e,t,n){this.notePool.register(e,t,n)},e.prototype.findNote=function(e){return this.notePool.find(e)},e.prototype.expireNote=function(e,t){this.notePool.unregister(e,t)},Object.defineProperty(e.prototype,"noteStore",{get:function(){return this.notePool.noteStore},enumerable:!0,configurable:!0}),e.prototype.onExpired=function(e){this._expiredEmitter.on(e)},e.prototype.offExpired=function(e){this._expiredEmitter.off(e)},e.prototype._expiredListener=function(e){this._expiredEmitter.emit(e)},e.prototype.onProgramChange=function(e){this._programChangeEmitter.on(e)},e.prototype.offProgramChange=function(e){this._programChangeEmitter.off(e)},e.prototype.receiveEvent=function(e,t){if(e instanceof re)switch(e.controller){case 7:this.setVolume(e.value,t);break;case 10:this.setPanpot(e.value);break;case 11:this.setExpression(e.value,t);break;case 6:this.dataEntry&=16256,this.dataEntry|=e.value,this.receiveRPN(this.rpn,this.dataEntry,t);break;case 38:this.dataEntry&=127,this.dataEntry|=e.value<<7;break;case 100:this.rpn&=16256,this.rpn|=e.value;break;case 101:this.rpn&=127,this.rpn|=e.value<<7;break;case 120:this.notePool.unregisterAll();break;case 121:this.resetAllControl();break;default:this.patch&&this.patch.receiveEvent(e,t)}else e instanceof ie?this._programChangeEmitter.emit(e):this.patch&&this.patch.receiveEvent(e,t)},e.prototype.receiveRPN=function(e,t,n){switch(e){case 0:this.pitchBendRange=t}},e}(),
ge=function(){function e(){}return e}(),
me=function(){function e(e,t){void 0===t&&(t=e.source),this.instrument=e,this.destination=t,this.tuning=new he}return Object.defineProperty(e.prototype,"detune",{get:function(){return this.instrument.detune},set:function(e){this.instrument.detune=e},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"audioContext",{get:function(){return this.instrument.audioContext},enumerable:!0,configurable:!0}),e.prototype.receiveEvent=function(e,t){if(e instanceof te){var n=this.onNoteOn(e,t);null!=n&&(null==n.parentPatch&&(n.parentPatch=this),this.instrument.registerNote(e.noteNumber,n,t))}else if(e instanceof ee){var n=this.instrument.findNote(e.noteNumber);null!=n&&this.onNoteOff(n,t)}else if(e instanceof ae)for(var r in this.instrument.noteStore){var n=this.instrument.noteStore[r];null!=n&&n.parentPatch===this&&this.onPitchBend(e,n,t)}},e.prototype.onNoteOn=function(e,t){return null},e.prototype.onNoteOff=function(e,t){},e.prototype.onExpired=function(e,t){setTimeout(function(){for(var t=0,n=e.managedNodes;t<n.length;t++){var r=n[t];r.disconnect()}},1e3)},e.prototype.onPitchBend=function(e,t,n){if(null!=t.detunableNodes)for(var r=0,i=t.detunableNodes;r<i.length;r++){var o=i[r],a=o;this.instrument.pitchBend=e.value,a.detune.setValueAtTime(this.detune,n)}},e}(),
ye=function(e){function t(){e.apply(this,arguments)}return Z(t,e),t}(ge),
ve=function(e){function t(t,n,r){void 0===n&&(n="square"),e.call(this,t,r),this.oscillatorType=n}return Z(t,e),t.prototype.onNoteOn=function(e,t){var n=new ye,r=this.audioContext.createOscillator(),i=this.audioContext.createGain();return n.oscillator=r,n.gain=i,n.managedNodes=[r,i],n.detunableNodes=[r],r.type=this.oscillatorType,r.frequency.value=this.tuning.frequency(e.noteNumber),r.detune.value=this.detune,i.gain.value=e.velocity/127,r.connect(i),i.connect(this.destination),r.start(t),n},t.prototype.onNoteOff=function(e,t){e.oscillator&&(e.oscillator.stop(t),e.gain.gain.cancelScheduledValues(t),e.gain.gain.setValueAtTime(0,t))},t.prototype.onExpired=function(e,t){this.onNoteOff(e,t)},t}(me),
be=function(e){function t(){e.apply(this,arguments)}return Z(t,e),t}(ge),
we=function(e){function t(n,r){if(e.call(this,n,r),null==t.noiseBuffer){for(var i=88200,o=this.audioContext.createBuffer(2,i,this.audioContext.sampleRate),a=o.getChannelData(0),s=o.getChannelData(1),u=0;u<a.length;++u)a[u]=2*Math.random()-1,s[u]=2*Math.random()-1;t.noiseBuffer=o}}return Z(t,e),t.prototype.onNoteOn=function(e,n){var r=new be,i=this.audioContext.createBufferSource(),o=this.audioContext.createBiquadFilter(),a=this.audioContext.createGain();return r.source=i,r.filter=o,r.gain=a,r.managedNodes=[i,o,a],r.detunableNodes=[o],i.buffer=t.noiseBuffer,i.loop=!0,o.type="bandpass",o.frequency.value=this.tuning.frequency(e.noteNumber+24),o.detune.value=this.detune,o.Q.value=1,a.gain.value=e.velocity/127,i.connect(o),o.connect(a),a.connect(this.destination),i.start(n),r},t.prototype.onNoteOff=function(e,t){e.source.stop(t),e.gain.gain.cancelScheduledValues(t),e.gain.gain.setValueAtTime(0,t)},t.prototype.onExpired=function(e,t){this.onNoteOff(e,t)},t}(me),
Ee=function(e){function t(t,n,r,i,o,a){e.call(this,t,a),this.valueAtBegin=n,this.valueAtEnd=r,this.duration=i,this.fixedFrequency=o}return Z(t,e),t.prototype.onNoteOn=function(t,n){var r=e.prototype.onNoteOn.call(this,t,n),i=r.filter,o=r.gain;null!=this.fixedFrequency?i.frequency.value=this.fixedFrequency:i.frequency.value=this.tuning.frequency(t.noteNumber+24);var a=o.gain.value;return o.gain.setValueAtTime(this.valueAtBegin*a,n),o.gain.linearRampToValueAtTime(this.valueAtEnd*a,n+this.duration),r},t}(we),
Te=function(e){function t(){e.apply(this,arguments)}return Z(t,e),t.prototype.onNoteOff=function(e,t){},t.prototype.onExpired=function(t,n){e.prototype.onExpired.call(this,t,n),t.source.stop(n),t.gain.gain.cancelScheduledValues(n),t.gain.gain.setValueAtTime(0,n)},t}(Ee),
xe=function(e){function t(t,n,r,i,o,a){e.call(this,t,o,a),this.valueAtBegin=n,this.valueAtEnd=r,this.duration=i}return Z(t,e),t.prototype.onNoteOn=function(t,n){var r=e.prototype.onNoteOn.call(this,t,n),i=r.gain,o=i.gain.value;return i.gain.setValueAtTime(this.valueAtBegin*o,n),i.gain.linearRampToValueAtTime(this.valueAtEnd*o,n+this.duration),r},t}(ve),
_e=function(e){function t(t,n,r,i,o){e.call(this,t,1,0,n,i,o),this.fixedFrequency=r}return Z(t,e),t.prototype.onNoteOn=function(t,n){var r,i=e.prototype.onNoteOn.call(this,t,n),o=i.oscillator;return r=null!=this.fixedFrequency?this.fixedFrequency:this.tuning.frequency(t.noteNumber+24),o.frequency.setValueAtTime(r,n),o.frequency.linearRampToValueAtTime(0,n+this.duration),i},t.prototype.onNoteOff=function(e,t){},t.prototype.onExpired=function(t,n){e.prototype.onExpired.call(this,t,n),t.oscillator.stop(n),t.gain.gain.cancelScheduledValues(n),t.gain.gain.setValueAtTime(0,n)},t}(xe),
Ce=function(e){function t(t,n){var r=t,i=n;e.call(this,r,i),i=this.destination;var o=this.audioContext.createGain();this.gain=o,this.gain.gain.value=2,o.connect(i);var a=this.audioContext.createPanner();this.leftPanpot=a;var s=-32*Math.PI/128;a.setPosition(Math.sin(s),0,-Math.cos(s)),a.connect(o);var u=this.audioContext.createPanner();this.rightPanpot=u;var l=32*Math.PI/128;u.setPosition(Math.sin(l),0,-Math.cos(l)),u.connect(o),this.patchMap={0:new Te(r,1,0,.05,null,o),35:new _e(r,.2,140,"sine",o),36:new _e(r,.2,150,"square",o),37:new Te(r,1,0,.1,2e3,o),38:new Te(r,1,0,.3,1e3,o),39:new Te(r,1,0,.4,3e3,o),40:new Te(r,1,0,.5,1500,o),41:new _e(r,.3,200,"sine",u),42:new Te(r,1,0,.1,6e3,a),43:new _e(r,.3,250,"sine",u),44:new Te(r,1,0,.1,5e3,a),45:new _e(r,.3,350,"sine",u),46:new Te(r,1,0,.3,6e3,a),47:new _e(r,.3,400,"sine",u),48:new _e(r,.3,500,"sine",u),49:new Te(r,1,0,1.5,8e3,o),50:new _e(r,.3,550,"sine",u),51:new Te(r,1,0,.5,16e3,o)}}return Z(t,e),t.prototype.onNoteOn=function(e,t){var n=e.noteNumber;n in this.patchMap||(n=0);var r=this.patchMap[n],i=[42,44,46];if(-1!=i.indexOf(n))for(var o=0;o<i.length;o++){var a=i[o];a!==n&&this.instrument.expireNote(a,t)}var s=r.onNoteOn(e,t);return s.parentPatch=r,s},t.prototype.onNoteOff=function(e,t){e.parentPatch.onNoteOff(e,t)},t.prototype.onExpired=function(e,t){e.parentPatch.onExpired(e,t)},t}(me),
Se=function(){function e(){}return e.prototype.generate=function(e,t,n){if(void 0===n&&(n=!1),n)return new Ce(e);if(119===t)return new Ee(e,0,1,1);if(126===t)return new we(e);if(t in Q){var r=Q[t];return 5>=t?new xe(e,1.2,.1,.7,r):new ve(e,r)}return new ve(e,"square")},e}(),
Ae=function(){function e(e,t){function n(e){var t=new pe(r.audioContext,r.gain);t.patch=r.patchGenerator.generate(t,0,9===e),r.instruments[e]=t,t.onExpired(function(e){e.data.parentPatch.onExpired(e.data,e.time)}),t.onProgramChange(function(n){t.patch=r.patchGenerator.generate(t,n.program,9===e)})}var r=this;this.audioContext=e,this.patchGenerator=new Se,this.instruments=[],this.gain=this.audioContext.createGain(),this.gain.gain.value=.1,this.dynamicsCompressor=this.audioContext.createDynamicsCompressor(),this.gain.connect(this.dynamicsCompressor),this.dynamicsCompressor.connect(t);for(var i=0;16>i;++i)n(i);this.paused=!1}return e.prototype.pause=function(){if(!this.paused){for(var e=0,t=this.instruments;e<t.length;e++){var n=t[e];n.pause()}this.paused=!0}},e.prototype.resume=function(){this.paused&&(this.paused=!1)},e.prototype.destroy=function(){for(var e=0,t=this.instruments;e<t.length;e++){var n=t[e];n.destroy()}this.instruments=[]},e.prototype.playEvent=function(e){if(!e.raw)return console.warn("Got empty event data!",e);var t=e.raw,n=e.time,r=new Uint8Array(t),i=new DataView(r.buffer),o=i.getUint8(0),a=f(i,1),s=K.create(a,0,o);s&&this.receiveExternalMidiEvent(s,n)},e.prototype.receiveExternalMidiEvent=function(e,t){var t=t||this.audioContext.currentTime;if(e instanceof J)this.instruments[e.channel].receiveEvent(e,t);else for(var n=0,r=this.instruments;n<r.length;n++){var i=r[n];i.receiveEvent(e,t)}},e}(),

ke=ke||{};
ke.Wasy=function(){
  function e(e,r,i){u=e,l=r,destination=l,n(),i(null,t())}
  function t(){return Object.keys(Q).map(function(e){return parseInt(e)}).concat([119,126])}
  function n(){c=new Ae(u,destination)}
  function r(){c.destroy(),c=null}
  function i(){console.log("Disconnecting Analyser!"),r(),u=null}
  function o(){c.paused?c.resume():c.pause()}
  function a(){r(),n()}
  function s(e){e.time||(e.time=u.currentTime),c.playEvent(e)}var u,l,c;return{load:e,unload:i,toggle:o,reset:a,event:s}
}(window);

var Me={};
Me.Parser=function(e,t){t=t||{},this.input=e,this.ip=t.index||0,this.length=t.length||e.length-this.ip,this.chunkList,this.offset=this.ip,this.padding=void 0!==t.padding?t.padding:!0,this.bigEndian=void 0!==t.bigEndian?t.bigEndian:!1},
Me.Chunk=function(e,t,n){this.type=e,this.size=t,this.offset=n},
Me.Parser.prototype.parse=function(){var e=this.length+this.offset;for(this.chunkList=[];this.ip<e;)this.parseChunk()},
Me.Parser.prototype.parseChunk=function(){var e,t=this.input,n=this.ip;this.chunkList.push(new Me.Chunk(String.fromCharCode(t[n++],t[n++],t[n++],t[n++]),e=this.bigEndian?(t[n++]<<24|t[n++]<<16|t[n++]<<8|t[n++])>>>0:(t[n++]|t[n++]<<8|t[n++]<<16|t[n++]<<24)>>>0,n)),n+=e,this.padding&&1===(n-this.offset&1)&&n++,this.ip=n},
Me.Parser.prototype.getChunk=function(e){var t=this.chunkList[e];return void 0===t?null:t},
Me.Parser.prototype.getNumberOfChunks=function(){return this.chunkList.length};

var Ne=Ne||{};
Ne.Parser=function(e,t){t=t||{},this.input=e,this.parserOption=t.parserOption,this.presetHeader,this.presetZone,this.presetZoneModulator,this.presetZoneGenerator,this.instrument,this.instrumentZone,this.instrumentZoneModulator,this.instrumentZoneGenerator,this.sampleHeader},
Ne.Parser.prototype.parse=function(){var e,t=new Me.Parser(this.input,this.parserOption);if(t.parse(),1!==t.chunkList.length)throw new Error("wrong chunk length");if(e=t.getChunk(0),null===e)throw new Error("chunk not found");this.parseRiffChunk(e),this.input=null},
Ne.Parser.prototype.parseRiffChunk=function(e){var t,n,r=this.input,i=e.offset;if("RIFF"!==e.type)throw new Error("invalid chunk type:"+e.type);if(n=String.fromCharCode(r[i++],r[i++],r[i++],r[i++]),"sfbk"!==n)throw new Error("invalid signature:"+n);if(t=new Me.Parser(r,{index:i,length:e.size-4}),t.parse(),3!==t.getNumberOfChunks())throw new Error("invalid sfbk structure");this.parseInfoList(t.getChunk(0)),this.parseSdtaList(t.getChunk(1)),this.parsePdtaList(t.getChunk(2))},
Ne.Parser.prototype.parseInfoList=function(e){var t,n,r=this.input,i=e.offset;if("LIST"!==e.type)throw new Error("invalid chunk type:"+e.type);if(n=String.fromCharCode(r[i++],r[i++],r[i++],r[i++]),"INFO"!==n)throw new Error("invalid signature:"+n);t=new Me.Parser(r,{index:i,length:e.size-4}),t.parse()},
Ne.Parser.prototype.parseSdtaList=function(e){var t,n,r=this.input,i=e.offset;if("LIST"!==e.type)throw new Error("invalid chunk type:"+e.type);if(n=String.fromCharCode(r[i++],r[i++],r[i++],r[i++]),"sdta"!==n)throw new Error("invalid signature:"+n);if(t=new Me.Parser(r,{index:i,length:e.size-4}),t.parse(),1!==t.chunkList.length)throw new Error("TODO");this.samplingData=t.getChunk(0)},
Ne.Parser.prototype.parsePdtaList=function(e){var t,n,r=this.input,i=e.offset;if("LIST"!==e.type)throw new Error("invalid chunk type:"+e.type);if(n=String.fromCharCode(r[i++],r[i++],r[i++],r[i++]),"pdta"!==n)throw new Error("invalid signature:"+n);if(t=new Me.Parser(r,{index:i,length:e.size-4}),t.parse(),9!==t.getNumberOfChunks())throw new Error("invalid pdta chunk");this.parsePhdr(t.getChunk(0)),this.parsePbag(t.getChunk(1)),this.parsePmod(t.getChunk(2)),this.parsePgen(t.getChunk(3)),this.parseInst(t.getChunk(4)),this.parseIbag(t.getChunk(5)),this.parseImod(t.getChunk(6)),this.parseIgen(t.getChunk(7)),this.parseShdr(t.getChunk(8))},
Ne.Parser.prototype.parsePhdr=function(e){var t=this.input,n=e.offset,r=this.presetHeader=[],i=e.offset+e.size;if("phdr"!==e.type)throw new Error("invalid chunk type:"+e.type);for(;i>n;)r.push({presetName:String.fromCharCode.apply(null,t.subarray(n,n+=20)),preset:t[n++]|t[n++]<<8,bank:t[n++]|t[n++]<<8,presetBagIndex:t[n++]|t[n++]<<8,library:(t[n++]|t[n++]<<8|t[n++]<<16|t[n++]<<24)>>>0,genre:(t[n++]|t[n++]<<8|t[n++]<<16|t[n++]<<24)>>>0,morphology:(t[n++]|t[n++]<<8|t[n++]<<16|t[n++]<<24)>>>0})},
Ne.Parser.prototype.parsePbag=function(e){var t=this.input,n=e.offset,r=this.presetZone=[],i=e.offset+e.size;if("pbag"!==e.type)throw new Error("invalid chunk type:"+e.type);for(;i>n;)r.push({presetGeneratorIndex:t[n++]|t[n++]<<8,presetModulatorIndex:t[n++]|t[n++]<<8})},
Ne.Parser.prototype.parsePmod=function(e){if("pmod"!==e.type)throw new Error("invalid chunk type:"+e.type);this.presetZoneModulator=this.parseModulator(e)},
Ne.Parser.prototype.parsePgen=function(e){if("pgen"!==e.type)throw new Error("invalid chunk type:"+e.type);this.presetZoneGenerator=this.parseGenerator(e)},
Ne.Parser.prototype.parseInst=function(e){var t=this.input,n=e.offset,r=this.instrument=[],i=e.offset+e.size;if("inst"!==e.type)throw new Error("invalid chunk type:"+e.type);for(;i>n;)r.push({instrumentName:String.fromCharCode.apply(null,t.subarray(n,n+=20)),instrumentBagIndex:t[n++]|t[n++]<<8})},
Ne.Parser.prototype.parseIbag=function(e){var t=this.input,n=e.offset,r=this.instrumentZone=[],i=e.offset+e.size;if("ibag"!==e.type)throw new Error("invalid chunk type:"+e.type);for(;i>n;)r.push({instrumentGeneratorIndex:t[n++]|t[n++]<<8,instrumentModulatorIndex:t[n++]|t[n++]<<8})},
Ne.Parser.prototype.parseImod=function(e){if("imod"!==e.type)throw new Error("invalid chunk type:"+e.type);this.instrumentZoneModulator=this.parseModulator(e)},
Ne.Parser.prototype.parseIgen=function(e){if("igen"!==e.type)throw new Error("invalid chunk type:"+e.type);this.instrumentZoneGenerator=this.parseGenerator(e)},
Ne.Parser.prototype.parseShdr=function(e){var t,n,r,i,o,a,s,u,l,c,f=this.input,h=e.offset,d=this.sample=[],p=this.sampleHeader=[],g=e.offset+e.size;if("shdr"!==e.type)throw new Error("invalid chunk type:"+e.type);for(;g>h;){t=String.fromCharCode.apply(null,f.subarray(h,h+=20)),n=(f[h++]<<0|f[h++]<<8|f[h++]<<16|f[h++]<<24)>>>0,r=(f[h++]<<0|f[h++]<<8|f[h++]<<16|f[h++]<<24)>>>0,i=(f[h++]<<0|f[h++]<<8|f[h++]<<16|f[h++]<<24)>>>0,o=(f[h++]<<0|f[h++]<<8|f[h++]<<16|f[h++]<<24)>>>0,a=(f[h++]<<0|f[h++]<<8|f[h++]<<16|f[h++]<<24)>>>0,s=f[h++],u=f[h++]<<24>>24,l=f[h++]|f[h++]<<8,c=f[h++]|f[h++]<<8;var m=new Int16Array(new Uint8Array(f.subarray(this.samplingData.offset+2*n,this.samplingData.offset+2*r)).buffer);if(i-=n,o-=n,a>0){var y=this.adjustSampleData(m,a);m=y.sample,a*=y.multiply,i*=y.multiply,o*=y.multiply}d.push(m),p.push({sampleName:t,startLoop:i,endLoop:o,sampleRate:a,originalPitch:s,pitchCorrection:u,sampleLink:l,sampleType:c})}},
Ne.Parser.prototype.adjustSampleData=function(e,t){for(var n,r,i,o,a=1;22050>t;){for(n=new Int16Array(2*e.length),r=o=0,i=e.length;i>r;++r)n[o++]=e[r],n[o++]=e[r];e=n,a*=2,t*=2}return{sample:e,multiply:a}},
Ne.Parser.prototype.parseModulator=function(e){for(var t,n,r=this.input,i=e.offset,o=e.offset+e.size,a=[];o>i;){if(i+=2,t=r[i++]|r[i++]<<8,n=Ne.Parser.GeneratorEnumeratorTable[t],void 0===n)a.push({type:n,value:{code:t,amount:r[i]|r[i+1]<<8<<16>>16,lo:r[i++],hi:r[i++]}});else switch(n){case"keyRange":case"velRange":case"keynum":case"velocity":a.push({type:n,value:{lo:r[i++],hi:r[i++]}});break;default:a.push({type:n,value:{amount:r[i++]|r[i++]<<8<<16>>16}})}i+=2,i+=2}return a},
Ne.Parser.prototype.parseGenerator=function(e){for(var t,n,r=this.input,i=e.offset,o=e.offset+e.size,a=[];o>i;)if(t=r[i++]|r[i++]<<8,n=Ne.Parser.GeneratorEnumeratorTable[t],void 0!==n)switch(n){case"keynum":case"keyRange":case"velRange":case"velocity":a.push({type:n,value:{lo:r[i++],hi:r[i++]}});break;default:a.push({type:n,value:{amount:r[i++]|r[i++]<<8<<16>>16}})}else a.push({type:n,value:{code:t,amount:r[i]|r[i+1]<<8<<16>>16,lo:r[i++],hi:r[i++]}});return a},
Ne.Parser.prototype.createInstrument=function(){var e,t,n,r,i,o,a,s,u,l=this.instrument,c=this.instrumentZone,f=[];for(o=0,a=l.length;a>o;++o){for(e=l[o].instrumentBagIndex,t=l[o+1]?l[o+1].instrumentBagIndex:c.length,n=[],s=e,u=t;u>s;++s)r=this.createInstrumentGenerator_(c,s),i=this.createInstrumentModulator_(c,s),n.push({generator:r.generator,generatorSequence:r.generatorInfo,modulator:i.modulator,modulatorSequence:i.modulatorInfo});f.push({name:l[o].instrumentName,info:n})}return f},
Ne.Parser.prototype.createPreset=function(){var e,t,n,r,i,o,a,s,u,l,c=this.presetHeader,f=this.presetZone,h=[];for(a=0,s=c.length;s>a;++a){for(e=c[a].presetBagIndex,t=c[a+1]?c[a+1].presetBagIndex:f.length,n=[],u=e,l=t;l>u;++u)i=this.createPresetGenerator_(f,u),o=this.createPresetModulator_(f,u),n.push({generator:i.generator,generatorSequence:i.generatorInfo,modulator:o.modulator,modulatorSequence:o.modulatorInfo}),r=void 0!==i.generator.instrument?i.generator.instrument.amount:void 0!==o.modulator.instrument?o.modulator.instrument.amount:null;h.push({name:c[a].presetName,info:n,header:c[a],instrument:r})}return h},
Ne.Parser.prototype.createInstrumentGenerator_=function(e,t){var n=this.createBagModGen_(e,e[t].instrumentGeneratorIndex,e[t+1]?e[t+1].instrumentGeneratorIndex:this.instrumentZoneGenerator.length,this.instrumentZoneGenerator);return{generator:n.modgen,generatorInfo:n.modgenInfo}},
Ne.Parser.prototype.createInstrumentModulator_=function(e,t){var n=this.createBagModGen_(e,e[t].presetModulatorIndex,e[t+1]?e[t+1].instrumentModulatorIndex:this.instrumentZoneModulator.length,this.instrumentZoneModulator);return{modulator:n.modgen,modulatorInfo:n.modgenInfo}},
Ne.Parser.prototype.createPresetGenerator_=function(e,t){var n=this.createBagModGen_(e,e[t].presetGeneratorIndex,e[t+1]?e[t+1].presetGeneratorIndex:this.presetZoneGenerator.length,this.presetZoneGenerator);return{generator:n.modgen,generatorInfo:n.modgenInfo}},
Ne.Parser.prototype.createPresetModulator_=function(e,t){var n=this.createBagModGen_(e,e[t].presetModulatorIndex,e[t+1]?e[t+1].presetModulatorIndex:this.presetZoneModulator.length,this.presetZoneModulator);return{modulator:n.modgen,modulatorInfo:n.modgenInfo}},
Ne.Parser.prototype.createBagModGen_=function(e,t,n,r){var i,o,a,s=[],u={unknown:[],keyRange:{hi:127,lo:0}};for(o=t,a=n;a>o;++o)i=r[o],s.push(i),"unknown"===i.type?u.unknown.push(i.value):u[i.type]=i.value;return{modgen:u,modgenInfo:s}},
Ne.Parser.GeneratorEnumeratorTable=["startAddrsOffset","endAddrsOffset","startloopAddrsOffset","endloopAddrsOffset","startAddrsCoarseOffset","modLfoToPitch","vibLfoToPitch","modEnvToPitch","initialFilterFc","initialFilterQ","modLfoToFilterFc","modEnvToFilterFc","endAddrsCoarseOffset","modLfoToVolume",,"chorusEffectsSend","reverbEffectsSend","pan",,,,"delayModLFO","freqModLFO","delayVibLFO","freqVibLFO","delayModEnv","attackModEnv","holdModEnv","decayModEnv","sustainModEnv","releaseModEnv","keynumToModEnvHold","keynumToModEnvDecay","delayVolEnv","attackVolEnv","holdVolEnv","decayVolEnv","sustainVolEnv","releaseVolEnv","keynumToVolEnvHold","keynumToVolEnvDecay","instrument",,"keyRange","velRange","startloopAddrsCoarseOffset","keynum","velocity","initialAttenuation",,"endloopAddrsCoarseOffset","coarseTune","fineTune","sampleID","sampleModes",,"scaleTuning","exclusiveClass","overridingRootKey"];var Ne=Ne||{};Ne.SynthesizerNote=function(e,t,n){this.ctx=e,this.destination=t,this.instrument=n,this.channel=n.channel,this.key=n.key,this.velocity=n.velocity,this.buffer=n.sample,this.playbackRate=n.basePlaybackRate,this.sampleRate=n.sampleRate,this.volume=n.volume,this.panpot=n.panpot,this.pitchBend=n.pitchBend,this.pitchBendSensitivity=n.pitchBendSensitivity,this.modEnvToPitch=n.modEnvToPitch,this.expression=n.expression,this.startTime=e.currentTime,this.computedPlaybackRate=this.playbackRate,this.noteOffState=!1,this.audioBuffer,this.bufferSource,this.panner,this.gainOutput,this.expressionGain,this.filter},

Ne.SynthesizerNote.prototype.noteOn=function(){var e,t,n,r,i,o,a,s,u,l,c,f=this.ctx,h=this.instrument,d=this.buffer,p=this.ctx.currentTime,g=p+h.volDelay,m=p+h.modDelay,y=g+h.volAttack,v=g+h.modAttack,b=y+h.volHold,w=v+h.modHold,T=b+h.volDecay,x=w+h.modDecay,_=h.loopStart/this.sampleRate,C=h.loopEnd/this.sampleRate,S=h.start/this.sampleRate;d=d.subarray(0,d.length+h.end),e=this.audioBuffer=f.createBuffer(1,d.length,this.sampleRate),t=e.getChannelData(0),t.set(d),n=this.bufferSource=f.createBufferSource(),n.buffer=e,n.loop=1===(1&h.sampleModes),n.loopStart=_,n.loopEnd=C,this.updatePitchBend(this.pitchBend),i=this.panner=f.createPanner(),o=this.gainOutput=f.createGain(),a=o.gain,this.expressionGain=f.createGain(),this.expressionGain.gain.value=this.expression/127,r=this.filter=f.createBiquadFilter(),r.type="lowpass",i.panningModel="equalpower",i.setPosition(Math.sin(this.panpot*Math.PI/2),0,Math.cos(this.panpot*Math.PI/2)),c=this.volume*(this.velocity/127)*(1-h.initialAttenuation/1e3),0>c&&(c=0),a.setValueAtTime(0,p),a.setValueAtTime(0,g),a.setTargetAtTime(c,g,h.volAttack),a.setValueAtTime(c,b),a.linearRampToValueAtTime(c*(1-h.volSustain),T),r.Q.setValueAtTime(Math.pow(10,h.initialFilterQ/200),p),s=this.amountToFreq(h.initialFilterFc),u=this.amountToFreq(h.initialFilterFc+h.modEnvToFilterFc),l=s+(u-s)*(1-h.modSustain),r.frequency.setValueAtTime(s,p),r.frequency.setValueAtTime(s,m),r.frequency.setTargetAtTime(u,m,h.modAttack),r.frequency.setValueAtTime(u,w),r.frequency.linearRampToValueAtTime(l,x),h.mute||this.connect(),n.start(0,S)},
Ne.SynthesizerNote.prototype.amountToFreq=function(e){return 440*Math.pow(2,(e-6900)/1200)},
Ne.SynthesizerNote.prototype.noteOff=function(){this.noteOffState=!0},
Ne.SynthesizerNote.prototype.isNoteOff=function(){return this.noteOffState},
Ne.SynthesizerNote.prototype.release=function(){var e=this.instrument,t=this.bufferSource,n=this.gainOutput,r=this.ctx.currentTime,i=e.releaseTime-64,o=e.volRelease*n.gain.value,a=r+o*(1+i/(0>i?64:63)),s=this.filter,u=this.amountToFreq(e.initialFilterFc),l=this.amountToFreq(e.initialFilterFc+e.modEnvToFilterFc),c=r+e.modRelease*(u===l?1:(s.frequency.value-u)/(l-u));if(this.audioBuffer)switch(e.sampleModes){case 0:break;case 1:n.gain.cancelScheduledValues(0),n.gain.setValueAtTime(n.gain.value,r),n.gain.linearRampToValueAtTime(0,a),s.frequency.cancelScheduledValues(0),s.frequency.setValueAtTime(s.frequency.value,r),s.frequency.linearRampToValueAtTime(u,c),t.playbackRate.cancelScheduledValues(0),t.playbackRate.setValueAtTime(t.playbackRate.value,r),t.playbackRate.linearRampToValueAtTime(this.computedPlaybackRate,c),t.stop(a);break;case 2:console.log("detected unused sampleModes!");break;case 3:t.loop=!1}},
Ne.SynthesizerNote.prototype.connect=function(){this.bufferSource.connect(this.filter),this.filter.connect(this.panner),this.panner.connect(this.expressionGain),this.expressionGain.connect(this.gainOutput),this.gainOutput.connect(this.destination)},
Ne.SynthesizerNote.prototype.disconnect=function(e){this.bufferSource.disconnect(e),this.filter.disconnect(e),this.panner.disconnect(e),this.expressionGain.disconnect(e),this.gainOutput.disconnect(e)},
Ne.SynthesizerNote.prototype.schedulePlaybackRate=function(){var e=this.bufferSource.playbackRate,t=this.computedPlaybackRate,n=this.startTime,r=this.instrument,i=n+r.modAttack,o=i+r.modDecay,a=t*Math.pow(Math.pow(2,1/12),this.modEnvToPitch*this.instrument.scaleTuning);e.cancelScheduledValues(0),e.setValueAtTime(t,n),e.linearRampToValueAtTime(a,i),e.linearRampToValueAtTime(t+(a-t)*(1-r.modSustain),o)},
Ne.SynthesizerNote.prototype.updateExpression=function(e){this.expressionGain.gain.value=(this.expression=e)/127},
Ne.SynthesizerNote.prototype.updatePitchBend=function(e){this.computedPlaybackRate=this.playbackRate*Math.pow(Math.pow(2,1/12),e/(0>e?8192:8191)*this.pitchBendSensitivity*this.instrument.scaleTuning),this.schedulePlaybackRate()};

var Ne=Ne||{};
Ne.Synthesizer=function(e,t){var n,r;for(this.output,this.input=e,this.parser,this.bank=0,this.bankSet,this.ctx=t,this.gainMaster=this.ctx.createGain(),this.bufSrc=this.ctx.createBufferSource(),this.channelInstrument=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],this.channelVolume=[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],this.channelPanpot=[64,64,64,64,64,64,64,64,64,64,64,64,64,64,64,64],this.channelPitchBend=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],this.channelPitchBendSensitivity=[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],this.channelExpression=[127,127,127,127,127,127,127,127,127,127,127,127,127,127,127,127],this.channelRelease=[64,64,64,64,64,64,64,64,64,64,64,64,64,64,64,64],this.channelHold=[!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1],this.channelMute=[!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1,!1],this.channelBankMsb=[0,0,0,0,0,0,0,0,0,128,0,0,0,0,0,0],this.channelBankLsb=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],this.isGS=!1,this.isXG=!1,this.currentNoteOn=[[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]],this.baseVolume=1/65535,this.masterVolume=16384,this.percussionVolume=new Array(128),n=0,r=this.percussionVolume.length;r>n;++n)this.percussionVolume[n]=127;this.reverb=!1,this.reverb&&(this.ir=Ne.getIR(this.ctx),this.reverbNode=this.ctx.createConvolver(),this.reverbLevel=this.ctx.createGain())},
Ne.Synthesizer.prototype.init=function(e){var t;for(this.output=e,this.parser=new Ne.Parser(this.input),this.bankSet=this.createAllInstruments(),this.reverb&&(this.reverbNode.buffer=this.ir,this.reverbLevel.gain.value=10),this.isXG=!1,this.isGS=!1,t=0;16>t;++t)this.programChange(t,0),this.volumeChange(t,100),this.panpotChange(t,64),this.pitchBend(t,0,64),this.pitchBendSensitivity(t,2),this.channelHold[t]=!1,this.channelExpression[t]=127,this.bankSelectMsb(t,9===t?128:0),this.bankSelectLsb(t,0);for(t=0;128>t;++t)this.percussionVolume[t]=127},
Ne.Synthesizer.prototype.refreshInstruments=function(e){this.input=e,this.parser=new Ne.Parser(e),this.bankSet=this.createAllInstruments()},
Ne.Synthesizer.prototype.createAllInstruments=function(){var e=this.parser;e.parse();var t,n,r,i,o,a,s,u,l=e.createPreset(),c=e.createInstrument(),f=[];for(o=0,a=l.length;a>o;++o)if(n=l[o],i=n.header.preset,"number"==typeof n.instrument&&(r=c[n.instrument],"EOI"!==r.name.replace(/\0*$/,"")))for(void 0===f[n.header.bank]&&(f[n.header.bank]=[]),t=f[n.header.bank],t[i]=[],t[i].name=n.name,s=0,u=r.info.length;u>s;++s)this.createNoteInfo(e,r.info[s],t[i]);return f},
Ne.Synthesizer.prototype.createNoteInfo=function(e,t,n){var r,i,o,a,s,u,l,c,f,h,d,p,g,m,y,v,b,w,T,x=t.generator;if(void 0!==x.keyRange&&void 0!==x.sampleID)for(o=this.getModGenAmount(x,"delayVolEnv",-12e3),a=this.getModGenAmount(x,"attackVolEnv",-12e3),s=this.getModGenAmount(x,"holdVolEnv",-12e3),u=this.getModGenAmount(x,"decayVolEnv",-12e3),l=this.getModGenAmount(x,"sustainVolEnv"),c=this.getModGenAmount(x,"releaseVolEnv",-12e3),f=this.getModGenAmount(x,"delayModEnv",-12e3),h=this.getModGenAmount(x,"attackModEnv",-12e3),d=this.getModGenAmount(x,"holdModEnv",-12e3),p=this.getModGenAmount(x,"decayModEnv",-12e3),g=this.getModGenAmount(x,"sustainModEnv"),m=this.getModGenAmount(x,"releaseModEnv",-12e3),y=this.getModGenAmount(x,"coarseTune")+this.getModGenAmount(x,"fineTune")/100,v=this.getModGenAmount(x,"scaleTuning",100)/100,b=this.getModGenAmount(x,"freqVibLFO"),w=x.keyRange.lo,T=x.keyRange.hi;T>=w;++w)n[w]||(r=this.getModGenAmount(x,"sampleID"),i=e.sampleHeader[r],n[w]={sample:e.sample[r],sampleRate:i.sampleRate,sampleModes:this.getModGenAmount(x,"sampleModes"),basePlaybackRate:Math.pow(Math.pow(2,1/12),(w-this.getModGenAmount(x,"overridingRootKey",i.originalPitch)+y+i.pitchCorrection/100)*v),modEnvToPitch:this.getModGenAmount(x,"modEnvToPitch")/100,scaleTuning:v,start:32768*this.getModGenAmount(x,"startAddrsCoarseOffset")+this.getModGenAmount(x,"startAddrsOffset"),end:32768*this.getModGenAmount(x,"endAddrsCoarseOffset")+this.getModGenAmount(x,"endAddrsOffset"),loopStart:i.startLoop+32768*this.getModGenAmount(x,"startloopAddrsCoarseOffset")+this.getModGenAmount(x,"startloopAddrsOffset"),loopEnd:i.endLoop+32768*this.getModGenAmount(x,"endloopAddrsCoarseOffset")+this.getModGenAmount(x,"endloopAddrsOffset"),volDelay:Math.pow(2,o/1200),volAttack:Math.pow(2,a/1200),volHold:Math.pow(2,s/1200)*Math.pow(2,(60-w)*this.getModGenAmount(x,"keynumToVolEnvHold")/1200),volDecay:Math.pow(2,u/1200)*Math.pow(2,(60-w)*this.getModGenAmount(x,"keynumToVolEnvDecay")/1200),volSustain:l/1e3,volRelease:Math.pow(2,c/1200),modDelay:Math.pow(2,f/1200),modAttack:Math.pow(2,h/1200),modHold:Math.pow(2,d/1200)*Math.pow(2,(60-w)*this.getModGenAmount(x,"keynumToModEnvHold")/1200),modDecay:Math.pow(2,p/1200)*Math.pow(2,(60-w)*this.getModGenAmount(x,"keynumToModEnvDecay")/1200),modSustain:g/1e3,modRelease:Math.pow(2,m/1200),initialFilterFc:this.getModGenAmount(x,"initialFilterFc",13500),modEnvToFilterFc:this.getModGenAmount(x,"modEnvToFilterFc"),initialFilterQ:this.getModGenAmount(x,"initialFilterQ"),reverbEffectSend:this.getModGenAmount(x,"reverbEffectSend"),initialAttenuation:this.getModGenAmount(x,"initialAttenuation"),freqVibLFO:b?8.176*Math.pow(2,b/1200):void 0})},
Ne.Synthesizer.prototype.getModGenAmount=function(e,t,n){return void 0===n&&(n=0),e[t]?e[t].amount:n},
Ne.Synthesizer.prototype.connect=function(){this.bufSrc.connect(this.gainMaster),this.reverb?this.connectReverb():this.gainMaster.connect(this.output)},
Ne.Synthesizer.prototype.connectReverb=function(){this.gainMaster.connect(this.reverbNode),this.reverbNode.connect(this.reverbLevel),this.reverbLevel.connect(this.output)},
Ne.Synthesizer.prototype.start=function(){this.connect(),this.bufSrc.start(0),this.setMasterVolume(16383)},
Ne.Synthesizer.prototype.setMasterVolume=function(e){this.masterVolume=e,this.gainMaster.gain.value=this.baseVolume*(e/16384)},
Ne.Synthesizer.prototype.stop=Ne.Synthesizer.prototype.disconnect=function(){for(var e=0;16>e;e++)this.allSoundOff(e);this.bufSrc.disconnect(0),this.gainMaster.disconnect(0),this.disconnectReverb()},
Ne.Synthesizer.prototype.disconnectReverb=function(){this.reverb&&(this.reverbNode.disconnect(0),this.reverbLevel.disconnect(0))},
Ne.Synthesizer.prototype.setReverb=function(e){this.reverb!==e&&(this.disconnectReverb(),this.reverb=e,e&&this.connectReverb())},
Ne.Synthesizer.prototype.noteOn=function(e,t,n){var r=this.channelBankMsb[e],i=128;9==e&&(r=i);var o,a,s=this.bankSet[r],u=s[this.channelInstrument[e]];if(!u)return void(u=s[r]);if(o=u[t],!o){if(!(128==r&&0==this.channelInstrument[e]&&t>=80))return void console.warn("key for instrument not found: bank=%s instrument=%s channel=%s key=%s",r,this.channelInstrument[e],e,t);o=u[t+2]}var l=this.channelPanpot[e]-64;l/=0>l?64:63,o.channel=e,o.key=t,o.velocity=n,o.panpot=l,o.volume=this.channelVolume[e]/127,o.pitchBend=this.channelPitchBend[e]-8192,o.expression=this.channelExpression[e],o.pitchBendSensitivity=this.channelPitchBendSensitivity[e],o.mute=this.channelMute[e],o.releaseTime=this.channelRelease[e],9===e&&(u.volume*=this.percussionVolume[t]/127),a=new Ne.SynthesizerNote(this.ctx,this.gainMaster,o),a.noteOn(),this.currentNoteOn[e].push(a)},
Ne.Synthesizer.prototype.noteOff=function(e,t,n){var r,i,o,a=this.channelBankMsb[e],s=this.bankSet[a],u=s[this.channelInstrument[e]],l=this.currentNoteOn[e],c=this.channelHold[e];if(u)for(r=0,i=l.length;i>r;++r)o=l[r],o.key===t&&(o.noteOff(),c||(o.release(),l.splice(r,1),--r,--i))},
Ne.Synthesizer.prototype.hold=function(e,t){var n,r,i,o=this.currentNoteOn[e],a=this.channelHold[e]=!(64>t);if(!a)for(r=0,i=o.length;i>r;++r)n=o[r],n.isNoteOff()&&(n.release(),o.splice(r,1),--r,--i)},
Ne.Synthesizer.prototype.bankSelectMsb=function(e,t){},
Ne.Synthesizer.prototype.bankSelectLsb=function(e,t){},
Ne.Synthesizer.prototype.programChange=function(e,t){(9!==e||this.isXG||this.isGS)&&(this.channelInstrument[e]=t)},
Ne.Synthesizer.prototype.volumeChange=function(e,t){this.channelVolume[e]=t},
Ne.Synthesizer.prototype.expression=function(e,t){var n,r,i=this.currentNoteOn[e];for(n=0,r=i.length;r>n;++n)i[n].updateExpression(t);this.channelExpression[e]=t},
Ne.Synthesizer.prototype.panpotChange=function(e,t){this.channelPanpot[e]=t},
Ne.Synthesizer.prototype.pitchBend=function(e,t,n){var r,i,o=127&t|(127&n)<<7,a=this.currentNoteOn[e],s=o-8192;for(r=0,i=a.length;i>r;++r)a[r].updatePitchBend(s);this.channelPitchBend[e]=o},
Ne.Synthesizer.prototype.pitchBendSensitivity=function(e,t){this.channelPitchBendSensitivity[e]=t},
Ne.Synthesizer.prototype.releaseTime=function(e,t){this.channelRelease[e]=t},
Ne.Synthesizer.prototype.getPitchBendSensitivity=function(e){return this.channelPitchBendSensitivity[e]},
Ne.Synthesizer.prototype.drumInstrumentLevel=function(e,t){this.percussionVolume[e]=t},
Ne.Synthesizer.prototype.allNoteOff=function(e){for(var t,n=this.currentNoteOn[e];n.length>0;)t=n.shift(),this.noteOff(e,t.key,0),t.release(),t.disconnect()},
Ne.Synthesizer.prototype.allSoundOff=function(e){for(var t=this.currentNoteOn[e];t.length>0;)this.noteOff(e,t[0].key,0)},
Ne.Synthesizer.prototype.resetAllControl=function(e){this.expression(e,127),this.pitchBend(e,0,64),this.hold(e,0)},
Ne.Synthesizer.prototype.mute=function(e,t){var n,r,i=this.currentNoteOn[e];if(this.channelMute[e]=t,t)for(n=0,r=i.length;r>n;++n)i[n].disconnect();else for(n=0,r=i.length;r>n;++n)i[n].connect()};

var ke=ke||{};
ke.SF2=function(){
  function e(e,n,r){u=e,f=n,l&&t(),p(h,{responseType:"arraybuffer"},function(e,t,n){return e||!n?r&&r(e):(c=new Uint8Array(n),l=new Ne.Synthesizer(c,u),l.init(f),l.start(),void r())})}
  function t(){l.stop(),l=null}
  function n(){l.refreshInstruments(c)}
  function r(e){var t=e.raw&&240&e.raw[0],n=e.raw&&15&e.raw[0];switch(144==t&&0==e.raw[2]&&(t=128),t){case 128:l.noteOff(n,e.raw[1],e.raw[2]);break;case 144:l.noteOn(n,e.raw[1],e.raw[2]);break;case 192:l.programChange(n,e.raw[1]);break;case 208:break;case 224:l.pitchBend(n,e.raw[1],e.raw[2]);break;case 176:i(n,e);break;case 240:o(n,e);break;default:console.log("Unsupported message type",t,e.raw)}}
  function i(e,t){switch(t.raw[1]){case 0:l.bankSelectMsb(e,t.raw[2]);break;case 6:if(d){if(0==y[e])switch(v[e]){case 0:l.pitchBendSensitivity(e,t.raw[2]);break;case 1:console.log("Fine");break;case 2:console.log("Coarse");break;default:console.log("Default")}}else switch(g[e]){case 26:l.drumInstrumentLevel(m[e],t.raw[2]);break;default:console.log("NRPN default:",g[e],m[e])}break;case 38:if(d)switch(y[e]){case 0:switch(v[e]){case 0:l.pitchBendSensitivity(e,l.getPitchBendSensitivity(e)+t.raw[2]/100);break;case 1:console.log("fine");break;case 2:console.log("coarse")}}break;case 7:l.volumeChange(e,t.raw[2]);break;case 10:l.panpotChange(e,t.raw[2]);break;case 11:l.expression(e,t.raw[2]);break;case 120:l.allSoundOff(e);break;case 121:l.resetAllControl(e);break;case 123:l.allSoundOff(e);break;case 32:l.bankSelectLsb(e,t.raw[2]);break;case 96:break;case 97:break;case 98:d=!1,m[e]=t.raw[2];break;case 99:d=!1,g[e]=t.raw[2];break;case 100:d=!0,v[e]=t.raw[2];break;case 101:d=!0,y[e]=t.raw[2];break;case 64:l.hold(e,t.raw[2]);break;case 65:break;case 91:console.log("Channel reverb",e);break;case 74:l.releaseTime(e,t.raw[2])}}
  function o(e,t){switch(t.raw[1]){case 126:console.log("Non realtime event!",t.raw),127===t.raw[2]&&9===t.raw[3]&&1===t.raw[4]&&l.init();break;case 127:t.raw[2];switch(t.raw[3]){case 4:switch(t.raw[4]){case 1:l.setMasterVolume(t.raw[5]+(t.raw[6]<<7))}}}switch(t.raw[2]){case 67:switch(console.log("Yamaha event!"),t.raw[7]){case 4:l.setMasterVolume(t.raw[8]<<7);break;case 126:l.init(f),l.isXG=!0}break;case 65:switch(console.log("Roland event!"),t.raw[8]){case 4:l.setMasterVolume(t.raw[9]<<7);break;case 127:l.init(f),l.isGS=!0}}}
  function a(e,t,n){l.noteOn(0,e,t||127)}
  function s(e,t){l.noteOff(0,e,t)}var u,l,c,f,h="./mini.sf2",d=!0,g=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],m=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],y=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],v=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];return{load:e,unload:t,reset:n,event:r,noteOn:a,noteOff:s}
}();

var Pe=function(){
  function e(e){return e.replace(/\s/g,"").match(/.{1,2}/g).map(function(e){return parseInt(e,16)})}
  function t(e,t){for(var n=[],r=0;r<e.length;r++){var i=e[r].toString(16);i.length<2&&(i="0"+i),n.push(i)}return n.join(t||"")}
  function n(e,t){for(var n=[],r=0,i=e.length;i>r;r++){var o=Number(e.charCodeAt(r)).toString(16);o.length<2&&(o="0"+o),n.push(o)}return n.join(t||"")}
  function r(){return e("F0 7E 7F 09 01 F7")}
  function i(){return e("F0 41 10 42 12 40 00 7F 00 41 F7")}
  function o(){return e("f0 41 10 16 12 7f 00 00 00 01 f7")}
  function a(e,t){var n=[],r=[],i=e.replace(/\s/g,"").match(/.{1,2}/g);do{var o=i.shift(),a=parseInt(o,16);t?r.push(a):r.push(o),240==a&&r.length>1&&console.warn("shit! putting a start sysex in between!"),247==a&&(n.push(r),r=[])}while(i.length>0);return n}
  function s(e,n){return e.length||(e=new Uint8Array(e)),a(t(e),n)}
  var u={};
  u.parse_bank=function(n){240==n[0]&&(console.log("removing header"),n=n.slice(6,-2));for(var r,i,o,a,s=0,u=n.length/128,l=[],c=0;u>c;c++)s=128*c,r=n.slice(s,s+128),i=this.unpack(r),o=t(i),a=e(this.send_one(o)),l.push(a);return l},
  u.send_one=function(e){return this.send_inst("00 01 1b",e,155)},
  u.send_many=function(e){return this.send_inst("09 20 00",e,4096)},
  u.send_inst=function(e,t,n){var r="f0 43 00",i=t.replace(/\s/g,"").trim().match(/.{1,2}/g);if(i.length!=n)throw new Error("Invalid value!");var o=0;i.forEach(function(e){o+=parseInt(e,16)}),o=~o+1&127;var a=o.toString(16);return a.length<2&&(a="0"+a),[r,e,i.join(" "),a,"f7"].join(" ")},
  u.unpack=function(e){if(128!=e.length)throw new Error("Invalid length: "+e.length+", should be 128");for(var t=new Int8Array(155),n=0,r=0,i=0;6>i;i++){for(var o=0;11>o;o++)t[n++]=e[r++];t[n++]=3&e[r],t[n++]=e[r++]>>2,t[n++]=7&e[r],t[n+6]=e[r++]>>3,t[n++]=3&e[r],t[n++]=e[r++]>>2,t[n++]=e[r++],t[n++]=1&e[r],t[n++]=e[r++]>>1,t[n]=e[r++],n+=2}for(var a=9;a>0;a--)t[n++]=e[r++];t[n++]=7&e[r],t[n++]=e[r++]>>3;for(var a=4;a>0;a--)t[n++]=e[r++];t[n++]=1&e[r],t[n++]=e[r]>>1&7,t[n++]=e[r++]>>4;for(var a=11;a>0;a--)t[n++]=e[r++];return t};
  var l={};
  return l.find_instrument=function(e){var t=Math.floor(7*Math.random()),n=Math.floor(48*Math.random());return{bank:t,voice:n}},l.find_and_set_patch=function(e,t){var n=l.find_instrument(t);return l.set_patch(e,n.bank,n.voice)},l.set_patch=function(e,t,n){var r=[240,67,e+15,21,4,t,247],i=[240,67,e+15,21,5,n,247];return[r,i]},l.set_number_of_notes=function(e,t){var n=[240,67,e+15,21,0,t,247];return[n]},l.set_volume=function(e){if(0>e||e>127)throw new Error("Volume must be between 0-127 range");return["F0 43 75 00 10 24 "+n(e)+" F7"]},l.reset=function(){var t=e("F0 43 75 00 10 21 00 F7"),n=e("F0 43 75 00 10 20 00 F7");return[t,n]},{parse_hex:a,parse_bytes:s,gm_reset:r,gs_reset:i,la_reset:o,FB01:l}
}(window),

ke=ke||{};
ke.WebMIDI=function(){
  function load(e,t,n){
    //navigator.requestMIDIAccess({sysex:!0}).then(
    navigator.requestMIDIAccess().then(
      function(e){
        c=e,
        r(),
        c.onstatechange=r,
        o(h.length-1,n)
      },
      function(e){
        n(e)
      }
    )
  }
  function t(e){e&&e()}
  function n(e,t){console.log("[webmidi] "+e,t)}
  function r(){
    ["outputs"].forEach(function(e){
      var t=document.getElementById("webmidi-"+e),
      n=c[e];
      i=0;
      var r="<h2>midi "+e+":</h2></ul>";
      n.forEach(function(e){
        h.push(e),r+='<li class="input" data-id="'+i++ +'"><h3>'+e.name+"</h3>",r+="<p>manufacturer: "+e.manufacturer+"</p>",r+="<p>version: "+e.version+"</p></li>"
      
      })+"</ul>",
      t&&(t.innerHTML=r)
    })
  }
  function o(e,t){return h[e]?(n("Selecting new output:",e,h[e].name),f=h[e],void t()):t(new Error("Invalid output port index: "+e))}
  function a(e,t){if(!f)throw new Error("No output selected!");t?f.send(e,t):f.send(e)}
  function s(e){if(!e)return console.warn("Empty event?");try{a(e.raw,e.time)}catch(t){n("Invalid message: "+t.message,e.raw)}}
  function u(e,t){function n(){var t=e.shift();if(127==t[5])var n=290;else var n=100;a(t),setTimeout(r,n)}function r(){e.length>0?n():t&&t()}if(!e.length)throw new Error("Empty or invalid array: "+e);r()}
  function l(){var e=Pe.gm_reset();a(e);var e=Pe.la_reset();a(e)}
  var c,f,h=[];
  return{
    load:load,
    unload:t,
    reset:l,
    event:s,
    sysex:u
  }
}(window);

var Ie=function(){
  function e(e,t){var e="[WebSynth] "+e;return t?console.log(e,t):console.log(e)}
  function t(e,t){return g=e,m=t,this}
  function r(){return y}
  function i(t){y=t,e("Current status: "+y),p.trigger(y,T.source,g)}
  function o(e){a(e.data,e.type)}
  function a(t,n){return"crashed"==y?e("Crashed. Cannot continue."):(h(!0),T.gain=g.createGain(),T.gain.gain.value=1,T.gain.connect(m),T.source=T.gain,void De.init(g,T.gain,function(e,n){c(t)}))}
  function s(){return"stopped"==y?e("Already stopped."):void h()}
  function u(){return"playing"!=y?e("Trying to pause, but currently "+y):void 0}
  function l(){if("playing"==y)return e("Trying to resume, but currently "+y);var t=(new Date-b)/1e3;x+=t,i("playing"),T.source.connect(T.gain)}
  function c(t){if("playing"==y)return e("Already playing!");De.play(t,function(e){p.trigger("length",e/1e3)},function(){f()}),i("playing"),v=g.currentTime,x=0;var n=setInterval(function(){if("stopped"==y)return clearInterval(n);var e=g.currentTime-v-x;p.trigger("progress",e)},50)}
  function f(){h(),p.trigger("finished")}
  function h(e){function t(){Object.keys(T).forEach(function(e){T[e]&&(T[e].disconnect(),"source"==e&&(T[e].onaudioprocess=null),delete T[e])})}T.gain&&(T.gain.gain.value=0),d(),e?t():(setTimeout(t,50),i("stopped"))}
  function d(){De.stop()}var p={};n(p);var g,m,y,v,b,w=["audio/midi"||"audio/x-midi"],T={},x=0;return p.init=t,p.status=r,p.play=o,p.stop=s,p.pause=u,p.resume=l,p.types=w,p
}(this);

var De=function(){
  function e(e,t){if(!ke[e])throw new Error("Invalid output: "+e);u&&(console.log("Unloading current output."),u.unload()),console.log("Loading output: "+e),u=ke[e],u.load(a,s,function(e){console.log(e||"Backend loaded."),t&&t(e)})}
  function t(t,n,r){if(a=t,f){var i=c(a);i.time=1,i.wet.value=.8,i.dry.value=1,i.filterType="lowpass",i.cutoff.value=4e3,i.connect(n),s=i}else s=n;e(h,r)}
  function n(e,t,n){function a(e){p("Song ended",e),i(),n&&n(e)}o&&r();var s=e.byteLength;p("Loading new sequence...",s),o=new q(e),o.on("midi_event",function(e){if(u.event){var t=e.raw&&240&e.raw[0];(l||144!=t)&&u.event(e)}}),t&&o.on("length",t),o.on("error",a),o.on("end",a),o.on("tempo",function(e){}),p("Playing song."),setTimeout(function(){o.play()},400)}
  function r(){o&&(i(),o.off("*"),o.unload(),o=null)}
  function i(){u.reset&&u.reset()}
  var o,a,s,u,l=!0,f=!1,h="Wasy",d=window.location.search.match(/websynth=(\d+)/);
  d&&"2"==d[1]&&(h="SF2"),
  d&&"3"==d[1]&&(h="WebMIDI");
  var p=function(e,t){console.log("[Tuple] "+e,t)};
  return{
    init:t,
    play:n,
    stop:r
  }
}();